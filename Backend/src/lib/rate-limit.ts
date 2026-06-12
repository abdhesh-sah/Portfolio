import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { redis } from "./redis.js";
import { logger } from "./logger.js";

import type { RequestHandler } from "express";

/**
 * Creates a standardized rate limiter with Redis backend if available.
 * Falls back to memory if Redis is unavailable at startup — store selection is static at module initialization.
 * 
 * IMPORTANT: "trust proxy 1" (set in index.ts) assumes exactly ONE proxy tier (e.g. Render).
 * If topology changes (e.g. Cloudflare + Render = 2 proxies), the "trust proxy" setting
 * must be updated to '2' in the Render dashboard (or env.ts) to correctly identify client IPs.
 */
const createLimiter = (options: {
    windowMs: number;
    max: number;
    message: string;
    skipSuccessfulRequests?: boolean;
    keyPrefix: string;
}): RequestHandler => {
    return rateLimit({
        windowMs: options.windowMs,
        max: options.max,
        message: { message: options.message },
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: options.skipSuccessfulRequests || false,
        skip: (req) => {
            // Allow E2E tests to force rate limiting even on localhost
            if (req.headers['x-test-force-rate-limit'] === 'true') return false;

            // Bypass rate limiting in test environment by default to ensure CI stability
            if (process.env.NODE_ENV === 'test') return true;
            
            // Standard bypass for localhost in DEV mode
            return req.ip === '127.0.0.1' || req.ip === '::1' || (req.ip?.includes('127.0.0.1') ?? false);
        },

        store: redis ? new RedisStore({
            sendCommand: async (...args: string[]) => {
                const [command, ...rest] = args;
                const result = await redis!.call(command, ...rest);
                return result as import("rate-limit-redis").RedisReply;
            },
            prefix: `rl:${options.keyPrefix}:`,
        }) : undefined,
        handler: (req, res, next, options) => {
            logger.warn({
                ip: req.ip,
                path: req.path,
                prefix: options.store instanceof RedisStore ? 'redis' : 'memory'
            }, "Rate limit exceeded");
            res.status(options.statusCode).send(options.message);
        }
    }) as unknown as RequestHandler;
};

/**
 * Global API limiter: 300 requests per 15 minutes
 */
export const globalLimiter = createLimiter({
    windowMs: 15 * 60 * 1000,
    max: 300,
    message: "Too many requests from this IP, please try again later",
    keyPrefix: "global",
});

/**
 * Auth limiter: 5 attempts per 15 minutes (skips successful logins)
 */
export const authLimiter = createLimiter({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: "Too many login attempts, please try again later",
    skipSuccessfulRequests: true,
    keyPrefix: "auth",
});

/**
 * Contact form limiter: 5 messages per 15 minutes
 */
export const contactLimiter = createLimiter({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: "Too many messages sent, please try again later",
    keyPrefix: "contact",
});

/**
 * Guestbook limiter: 5 entries per hour
 */
export const guestbookLimiter = createLimiter({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: "Too many guestbook entries, please try again in an hour",
    keyPrefix: "guestbook",
});

/**
 * Sensitive API limiter: 20 requests per 15 minutes
 */
export const strictApiLimiter = createLimiter({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: "Action limit exceeded, please try again later",
    keyPrefix: "strict",
});

/**
 * AI API limiter: 5 requests per minute
 */
export const aiLimiter = createLimiter({
    windowMs: 60 * 1000,
    max: 5,
    message: "AI request limit exceeded, please try again in a minute",
    keyPrefix: "ai",
});


