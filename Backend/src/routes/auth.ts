import { Router, Request, Response } from "express";
import { z } from "zod";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { env } from "../env.js";
import { createAccessToken, createRefreshToken, validateRefreshToken, revokeRefreshToken, revokeToken, isAuthenticated, extractToken } from "../auth.js";
import { asyncHandler } from "../lib/async-handler.js";
import { recordAudit } from "../lib/audit.js";
import { logger } from "../lib/logger.js";
import { getIsProd } from "../lib/is-prod.js";
import { generateCsrfToken } from "../middleware/csrf.js";
import { redis } from "../lib/redis.js";

import { authLimiter } from "../lib/rate-limit.js";

const router = Router();

/** DRY cookie options generator */
function getCookieOptions(isProd: boolean, maxAge: number): {
    httpOnly: boolean;
    secure: boolean;
    sameSite: "none" | "lax";
    path: string;
    maxAge: number;
} {
    return {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "none" : "lax",
        path: "/",
        maxAge,
    };
}

const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000;         // 15 minutes
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

const loginSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(1),
});



/**
 * POST /api/auth/login
 * Verifies credentials and returns a JWT
 */
router.post("/login", authLimiter, asyncHandler(async (req: Request, res: Response) => {
    let email, password;
    try {
        const parsed = loginSchema.parse(req.body);
        email = parsed.email;
        password = parsed.password;
    } catch {
        res.status(400).json({ success: false, message: "Password is required" });
        return;
    }

    if (!email) {
        email = env.ADMIN_EMAIL;
    }

    const lockoutKey = `lockout:active:${email}`;
    const countKey = `lockout:count:${email}`;

    if (redis && env.NODE_ENV !== "test") {
        const isLocked = await redis.get(lockoutKey);
        if (isLocked) {
            logger.warn({ context: "auth", email }, "Login attempt for locked-out account");
            res.status(423).json({ success: false, message: "Account is temporarily locked due to too many failed attempts. Try again in 15 minutes." });
            return;
        }
    }

    let isValid = false;

    // Verify password (best-effort bcrypt support)
    let isMatch = false;
    try {
        if (env.ADMIN_PASSWORD.startsWith('$2b$') || env.ADMIN_PASSWORD.startsWith('$2a$')) {
            isMatch = await bcrypt.compare(password, env.ADMIN_PASSWORD);
        } else {
            // Fallback to plain text for dev/test environments without hashed secrets
            isMatch = password === env.ADMIN_PASSWORD;
            if (isMatch) {
                logger.warn({ context: "auth" }, "Login successful using plain-text ADMIN_PASSWORD. Please use a bcrypt hash for production.");
            }
        }
    } catch (err) {
        logger.error({ context: "auth", error: err }, "Password verification failed");
        isMatch = false;
    }

    if (!isMatch) {
        isValid = false;
    } else {
        isValid = true;
    }

    if (!isValid) {
        if (redis && env.NODE_ENV !== "test") {
            const currentCount = await redis.incr(countKey);
            if (currentCount === 1) await redis.expire(countKey, 900); // 15 min window
            if (currentCount >= 5) {
                await redis.set(lockoutKey, "1", "EX", 900); // 15 min lockout
                logger.error({ context: "auth", email }, "Account lockout triggered");
            }
        }
        
        logger.warn({ context: "auth", ip: req.ip }, "Failed login attempt");
        recordAudit("LOGIN_FAILED", "auth", undefined, null, { ip: req.ip, email });
        
        res.status(401).json({ success: false, message: "Invalid credentials" });
        return;
    }

    // Success — Clear lockout counters
    if (redis) {
        await redis.del(countKey);
        await redis.del(lockoutKey);
    }

    // Generate JWT access token
    const accessToken = await createAccessToken();

    // Generate stateless JWT refresh token (validated by signature, not Redis)
    const refreshToken = createRefreshToken();
    // await storeRefreshToken(refreshToken); // REMOVED: P0 Logic fix. Stateless JWTs don't need "tracking" in Redis.

    const isProd = getIsProd(req);

    // Set HttpOnly access token cookie (15 min)
    res.cookie("auth_token", accessToken, getCookieOptions(isProd, ACCESS_TOKEN_MAX_AGE));

    // Set HttpOnly refresh token cookie (7 days)
    res.cookie("refresh_token", refreshToken, getCookieOptions(isProd, REFRESH_TOKEN_MAX_AGE));

    // Set readable CSRF cookie (NOT httpOnly so frontend JS can read it)
    const csrfToken = generateCsrfToken();
    res.cookie("csrf_token", csrfToken, {
        ...getCookieOptions(isProd, REFRESH_TOKEN_MAX_AGE),
        httpOnly: false,
    });

    logger.info({ context: "auth", ip: req.ip }, "Admin login");
    recordAudit("LOGIN_SUCCESS", "auth", undefined, null, { ip: req.ip });

    res.json({ success: true, message: "Login successful", csrfToken });
}));

/**
 * GET /api/auth/status
 * Returns current auth status. Returns 200 regardless of auth to avoid console error noise.
 */
router.get("/status", asyncHandler(async (req: Request, res: Response) => {
    // Return existing CSRF token from cookie if present, otherwise generate a new one
    // to ensure frontend memory store is always populated after reload
    let csrfToken = req.cookies?.csrf_token;

    if (!csrfToken) {
        csrfToken = generateCsrfToken();
        const isProd = getIsProd(req);
        res.cookie("csrf_token", csrfToken, {
            httpOnly: false,
            secure: isProd,
            sameSite: isProd ? "none" : "lax",
            path: "/",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
    }

    // Check if user is actually authenticated using structurally-validated token
    // extractToken validates the JWT has 3 dot-separated segments, breaking the
    // user-controlled taint flow before any security-gating condition.
    const token = extractToken(req);

    if (!token) {
        return res.json({
            success: true,
            authenticated: false,
            csrfToken
        });
    }

    try {
        // Hardcode algorithm to prevent JWT algorithm confusion attacks
        jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] });
        return res.json({
            success: true,
            authenticated: true,
            csrfToken
        });
    } catch (__err) { // eslint-disable-line @typescript-eslint/no-unused-vars
        return res.json({
            success: true,
            authenticated: false,
            csrfToken
        });
    }
}));


/**
 * POST /api/auth/refresh
 * Validates refresh token cookie and issues new access token.
 * Returns 200 OK even on failure (with success: false) to avoid console error noise.
 */
router.post("/refresh", asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refresh_token;

    // Validate cookie value is a string before using it in a security check
    if (!refreshToken || typeof refreshToken !== "string") {
        return res.json({ success: false, message: "No refresh token provided" });
    }

    // 1. Validate the old token (verifies signature and checks Redis blacklist)
    const isValid = await validateRefreshToken(refreshToken);

    if (!isValid) {
        // SECURITY: If a valid-looking JWT is reused after revocation, 
        // it might indicate a theft. In high-sec apps, we might revoke the 
        // entire family here. For now, we just reject.
        return res.json({ success: false, message: "Invalid or expired refresh token" });
    }

    // 2. ROTATE: Revoke the old refresh token immediately (A3)
    await revokeRefreshToken(refreshToken);
    
    // 3. Issue a new pair, keeping the family ID (fid) for continued rotation tracking
    const decodedToken = jwt.decode(refreshToken) as { fid?: string } | null;
    const newAccessToken = await createAccessToken();
    const newRefreshToken = createRefreshToken(decodedToken?.fid);
    
    const isProd = getIsProd(req);

    // 4. Set new cookies
    res.cookie("auth_token", newAccessToken, getCookieOptions(isProd, ACCESS_TOKEN_MAX_AGE));
    res.cookie("refresh_token", newRefreshToken, getCookieOptions(isProd, REFRESH_TOKEN_MAX_AGE));

    const newCsrfToken = generateCsrfToken();
    res.cookie("csrf_token", newCsrfToken, {
        ...getCookieOptions(isProd, REFRESH_TOKEN_MAX_AGE),
        httpOnly: false,
    });

    res.json({ 
        success: true, 
        message: "Token refreshed successfully", 
        csrfToken: newCsrfToken 
    });
}));

/**
 * POST /api/auth/logout
 * Blacklists current token and clears cookie
 */
router.post("/logout", asyncHandler(async (req: Request, res: Response) => {
    // Best-effort: revoke access token if present and valid
    let token: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
    } else if (req.cookies && req.cookies.auth_token) {
        token = req.cookies.auth_token;
    }

    if (token) {
        try { await revokeToken(token); } catch { /* best-effort */ }
    }

    // Best-effort: revoke refresh token from Redis
    const refreshToken = req.cookies?.refresh_token;
    if (refreshToken) {
        try { await revokeRefreshToken(refreshToken); } catch { /* best-effort */ }
    }

    const isProd = getIsProd(req);

    // Always clear all cookies regardless of token validity
    res.clearCookie("auth_token", getCookieOptions(isProd, 0));
    res.clearCookie("refresh_token", getCookieOptions(isProd, 0));
    res.clearCookie("csrf_token", { ...getCookieOptions(isProd, 0), httpOnly: false });

    logger.info({ context: "auth", ip: req.ip }, "User logged out");
    recordAudit("LOGOUT", "auth", undefined, null, { ip: req.ip });

    res.json({
        success: true,
        message: "Logged out successfully"
    });
}));

/**
 * POST /api/auth/revoke-all
 * Global revocation: Increments the global token version in Redis,
 * invalidating all currently active JWTs on the next verification.
 */
router.post("/revoke-all", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    if (!redis) {
        return res.status(503).json({ success: false, message: "Redis is required for global revocation." });
    }

    try {
        const newVersion = await redis.incr("glob:admin_token_version");
        const adminRole = req.user && typeof req.user === 'object' ? req.user.role : 'unknown';
        logger.info({ context: "auth", admin: adminRole }, `Global session revocation triggered. New version: ${newVersion}`);
        
        res.json({ 
            success: true, 
            message: "Global revocation successful. All other active sessions will be invalidated on their next request." 
        });
    } catch (err) {
        logger.error({ context: "auth", error: err }, "Failed to increment global token version");
        res.status(500).json({ success: false, message: "Failed to perform global revocation" });
    }
}));

export { router as authRoutes };
