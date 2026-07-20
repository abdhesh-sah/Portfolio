import { Request, Response, NextFunction } from "express";
import { isDatabaseAvailable, recordSuccess, recordFailure, getCircuitState } from "../lib/circuit-breaker.js";
import { logger } from "../lib/logger.js";

/**
 * Database Guard Middleware
 * 
 * Sits before all API routes and checks the circuit breaker state.
 * If the database is known to be down (circuit OPEN), it immediately
 * returns a friendly 503 instead of letting the request hit the DB
 * and fail with a raw 500.
 * 
 * Read-only public endpoints that don't need the DB (e.g. /ping, /health)
 * should be registered BEFORE this middleware.
 * 
 * In test mode, the circuit breaker is bypassed to prevent transient DB
 * errors from cascading into 503s during E2E test runs.
 */

// Paths that should bypass the DB guard (they handle DB errors themselves or don't need DB)
const BYPASS_PATHS = new Set([
    "/auth/status",
    "/auth/login",
    "/auth/refresh",
    "/auth/logout",
    "/test/reset",
]);

const isTestEnv = process.env.NODE_ENV === "test";

export function dbGuard(req: Request, res: Response, next: NextFunction): void {
    // Skip for safe read-only methods on public endpoints that have their own caching
    // or for auth endpoints that need to work even during DB issues
    if (BYPASS_PATHS.has(req.path)) {
        next();
        return;
    }

    // In test mode, skip the circuit breaker entirely.
    // The circuit breaker is a production safety feature to prevent cascading failures.
    // In E2E tests, transient DB errors (e.g., during table truncation/seeding) can
    // falsely trip the breaker and cause unrelated tests to fail with 503s.
    if (isTestEnv) {
        next();
        return;
    }

    if (!isDatabaseAvailable()) {
        logger.warn({
            context: "db-guard",
            path: req.path,
            method: req.method,
            state: getCircuitState(),
            requestId: req.id,
        }, "Request blocked by circuit breaker — database unavailable");

        res.status(503).json({
            error: {
                message: "Service temporarily unavailable. The database is experiencing issues. Please try again in a moment.",
                status: 503,
                retryAfter: 30,
            }
        });
        return;
    }

    // Wrap res.on('finish') to track success/failure for the circuit breaker
    // WARNING: This records a failure for any 5xx response, which can cause 
    // false-positive circuit breaker trips if an application-level bug throws
    // an unhandled 500 error while the database is actually healthy.
    res.on("finish", () => {
        if (res.statusCode >= 500) {
            logger.error({
                context: "db-guard",
                path: req.path,
                method: req.method,
                statusCode: res.statusCode,
                requestId: req.id,
            }, `Circuit breaker: recording failure for ${req.method} ${req.path} → ${res.statusCode}`);
            recordFailure();
        } else {
            recordSuccess();
        }
    });

    next();
}
