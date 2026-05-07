import { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger.js";

/**
 * API Version Guard Middleware
 * 
 * Ensures that all requests that look like API calls are directed to
 * a supported version (currently only /api/v1/*).
 * 
 * This prevents accidental exposure of internal or unversioned routes.
 */

const ALLOWED_V1_PREFIXES = [
    "/v1/",
    "/health",
    "/ping",
    "/v1/debug-sentry"
];

export function versionGuard(req: Request, res: Response, next: NextFunction): void {
    const path = req.path;
    
    // Since this is mounted at /api, req.path is already relative to /api.
    // We want to ensure it starts with /v1/
    const isAllowed = path.startsWith("/v1/") || path === "/v1" || ALLOWED_V1_PREFIXES.some(prefix => path.startsWith(prefix));

    if (!isAllowed) {
        logger.warn({
            context: "version-guard",
            path: req.originalUrl,
            requestId: req.id,
        }, "Blocked request to unsupported API version");

        res.status(404).json({
            error: {
                message: `Unsupported API version or route: ${req.originalUrl}. Only v1 is currently supported.`,
                status: 404
            }
        });
        return;
    }

    next();
}
