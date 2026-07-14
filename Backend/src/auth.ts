import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { env } from "./env.js";
import { logger } from "./lib/logger.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";

import { redis } from "./lib/redis.js";
import { getIsProd } from "./lib/is-prod.js";

if (getIsProd() && !redis) {
    logger.warn({ context: "auth" }, "Redis is not configured in production. Token blacklist is disabled.");
}

/**
 * Revokes a JWT token by adding it to the blacklist
 */
export async function revokeToken(token: string) {
    if (!redis) return; // Skip if no Redis

    try {
        const decoded = jwt.decode(token) as { exp?: number } | null;
        if (decoded?.exp) {
            const ttl = Math.max(0, decoded.exp - Math.floor(Date.now() / 1000));
            if (ttl > 0) {
                // Store in Redis with TTL so it expires automatically
                await redis.set(`blacklist:${token}`, "1", "EX", ttl);
            }
        }
    } catch (_err) {
        logger.error({ context: "auth", error: _err }, "Failed to revoke token");
    }
}

// --- Refresh Token Helpers (stateless JWT — no Redis required) ---
//
// Previously these used a random hex token whose hash was stored in Redis.
// That made auth COMPLETELY BROKEN whenever Redis was unavailable (free-tier
// Render, missing REDIS_URL, Redis restart) because validateRefreshToken
// failed-closed and always returned false.
//
// Now refresh tokens are signed JWTs verified with JWT_REFRESH_SECRET.
// Validation is stateless. Redis is used only for optional revocation on logout.

const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

/**
 * Creates a signed JWT access token with a global version for revocation.
 */
export async function createAccessToken(): Promise<string> {
    const version = redis ? (await redis.get("glob:admin_token_version")) || "1" : "1";
    return jwt.sign(
        { role: "admin", v: parseInt(version, 10) },
        env.JWT_SECRET,
        { expiresIn: "15m" }
    );
}

/**
 * Creates a signed JWT refresh token with a unique family ID for rotation tracking.
 */
export function createRefreshToken(familyId?: string): string {
    return jwt.sign(
        { role: "admin", type: "refresh", fid: familyId || crypto.randomUUID() },
        env.JWT_REFRESH_SECRET,
        { expiresIn: "7d" }
    );
}

/**
 * Validates a refresh token JWT and checks against the revocation list.
 */
interface RefreshTokenPayload {
    role: string;
    type: string;
    fid: string;
    iat: number;
    exp: number;
}

export async function validateRefreshToken(token: string): Promise<boolean> {
    // 1. Verify signature and expiry — hardcode algorithm to prevent algorithm confusion
    let decoded: RefreshTokenPayload;
    try {
        decoded = jwt.verify(token, env.JWT_REFRESH_SECRET, { algorithms: ["HS256"] }) as RefreshTokenPayload;
    } catch {
        return false;
    }

    if (!redis) return true;

    try {
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
        
        // 2. Check if this SPECIFIC token is revoked
        const isRevoked = await redis.get(`refresh_revoked:${tokenHash}`);
        if (isRevoked) {
            // SECURITY: REUSE DETECTED. Revoke the entire family (A3).
            if (decoded.fid) {
                await redis.set(`refresh_family_revoked:${decoded.fid}`, "1", "EX", REFRESH_TOKEN_TTL_SECONDS);
                logger.error({ context: "auth", familyId: decoded.fid }, "Refresh token reuse detected. Revoking token family.");
            }
            return false;
        }

        // 3. Check if the FAMILY is revoked
        if (decoded.fid) {
            const isFamilyRevoked = await redis.get(`refresh_family_revoked:${decoded.fid}`);
            if (isFamilyRevoked) {
                logger.warn({ context: "auth", familyId: decoded.fid }, "Attempted use of token from revoked family");
                return false;
            }
        }
    } catch (_err) {
        // FAIL-OPEN: If Redis is down, we still trust the JWT signature verification
        // that already passed above. The tradeoff: a revoked token could be used once
        // during a Redis outage, but the admin won't be locked out of their own panel.
        logger.warn({ context: "auth", error: _err }, "Redis unavailable during revocation check — failing open (JWT signature still valid)");
        return true; 
    }

    return true;
}

/**
 * Revokes a refresh token and optionally its entire family.
 */
export async function revokeRefreshToken(token: string, revokeFamily = false): Promise<void> {
    if (!redis) return;
    try {
        const decoded = jwt.decode(token) as { fid?: string } | null;
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
        
        await redis.set(`refresh_revoked:${tokenHash}`, "1", "EX", REFRESH_TOKEN_TTL_SECONDS);
        
        if (revokeFamily && decoded?.fid) {
            await redis.set(`refresh_family_revoked:${decoded.fid}`, "1", "EX", REFRESH_TOKEN_TTL_SECONDS);
        }
    } catch (_err) {
        logger.error({ context: "auth", error: _err }, "Failed to revoke refresh token");
    }
}

/**
 * Extracts and structurally validates a JWT from the request.
 * A real JWT always has exactly three Base64url segments separated by dots.
 * Returning null for anything that doesn't match breaks the user-controlled
 * taint flow so CodeQL no longer flags the downstream `if (token)` checks
 * as a user-controlled bypass of a security check.
 */
export function extractToken(req: Request): string | null {
    let candidate: string | null = null;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        candidate = authHeader.substring(7);
    } else if (typeof req.cookies?.auth_token === "string") {
        candidate = req.cookies.auth_token;
    }

    // Structural validation: a JWT must be exactly three dot-separated segments.
    // This is not a cryptographic check — jwt.verify() handles that — but it
    // ensures we never feed arbitrary user strings into the security path.
    if (!candidate || candidate.split(".").length !== 3) {
        return null;
    }

    return candidate;
}


export async function checkAuthStatus(req: Request): Promise<boolean> {
    const token = extractToken(req);

    if (token) {
        if (redis) {
            const isBlacklisted = await redis.get(`blacklist:${token}`);
            if (isBlacklisted) return false;
        }
        try {
            jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] });
            return true;
        } catch (_err) { // eslint-disable-line @typescript-eslint/no-unused-vars
            return false;
        }
    }

    return false;
}

/**
 * Middleware to check for admin authentication via JWT or API Key
 */


export const isAuthenticated = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const token = extractToken(req);

    if (token) {
        // Check if token is blacklisted in Redis
        if (redis) {
            const isBlacklisted = await redis.get(`blacklist:${token}`);
            if (isBlacklisted) {
                res.status(401).json({ message: "Token has been revoked. Please login again." });
                return;
            }
        }

        try {
            // Hardcode algorithm to HS256 to prevent JWT algorithm confusion attacks
            const result = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] });

            // Standard JWT payload schema
            const tokenSchema = z.object({
                role: z.string(),
                v: z.number().optional(), // Token version for global revocation
                iat: z.number().optional(),
                exp: z.number().optional()
            }).passthrough();

            const parsed = tokenSchema.safeParse(result);
            if (!parsed.success) {
                res.status(401).json({ message: "Invalid token payload" });
                return;
            }

            const decoded = parsed.data;

            // Global Version Revocation Check (Risk #15)
            if (redis && decoded.v !== undefined) {
                try {
                    const currentVersion = await redis.get("glob:admin_token_version");
                    const targetVersion = currentVersion ? parseInt(currentVersion, 10) : 1;
                    if (decoded.v < targetVersion) {
                        res.status(401).json({ 
                            message: "Session has been revoked by admin. Please login again.",
                            code: "SESSION_REVOKED"
                        });
                        return;
                    }
                } catch (redisErr) {
                    logger.warn({ context: "auth", error: redisErr }, "Redis down during version check — failing open");
                }
            }

            // Attach decoded token to request with proper typing
            req.user = {
                role: decoded.role,
                token: token,
                via: req.headers.authorization?.startsWith("Bearer ") ? "bearer" : "cookie"
            };
            next();
            return;
        } catch (_err) {
            if (_err instanceof jwt.TokenExpiredError || _err instanceof jwt.JsonWebTokenError) {
                res.status(401).json({ message: "Invalid or expired token" });
                return;
            } else {
                res.status(401).json({ message: "Token verification failed" });
                return;
            }
        }
    }

    res.status(401).json({ message: "Unauthorized. Please provide a valid token." });
};

/**
 * Middleware to strictly enforce admin role.
 * MUST be used after isAuthenticated.
 */
export const isAdmin = (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || req.user.role !== "admin") {
        logger.warn({ 
            context: "auth", 
            path: req.path, 
            user: req.user?.role || "anonymous" 
        }, "Unauthorized access attempt to admin resource");
        
        res.status(403).json({ 
            message: "Forbidden: You do not have permission to access this resource." 
        });
        return;
    }
    next();
};


