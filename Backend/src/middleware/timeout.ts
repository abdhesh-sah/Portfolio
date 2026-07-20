import { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger.js";

/**
 * Global Request Timeout Middleware
 * 
 * Enforces a 10-second timeout on all API requests to prevent hanging connections.
 * This protects the server from resource exhaustion due to slow external
 * dependencies or database queries.
 */

const REQUEST_TIMEOUT_MS = 10_000; // 10 seconds

export function timeoutGuard(req: Request, res: Response, next: NextFunction): void {
    const timer = setTimeout(() => {
        if (!res.headersSent) {
            logger.error({
                context: "timeout-guard",
                path: req.path,
                method: req.method,
                requestId: (req as any).id,
            }, "Request timed out after 10s");

            // Set flag so downstream handlers can check and abort slow operations
            (req as any).timedout = true;

            res.status(503).json({
                error: {
                    message: "Request timed out. The server took too long to respond.",
                    status: 503,
                    context: "timeout"
                }
            });
        }
    }, REQUEST_TIMEOUT_MS);

    // Clear timeout when request finishes successfully so memory is freed instantly
    res.on("finish", () => {
        clearTimeout(timer);
    });

    // Clear timeout if client closes connection early
    res.on("close", () => {
        clearTimeout(timer);
        if (!res.writableEnded) {
            (req as any).timedout = true;
        }
    });

    next();
}