import { Router, type RequestHandler } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { analyticsService } from "../services/analytics.service.js";
import { insertAnalyticsSchema } from "@portfolio/shared";
import { isAuthenticated } from "../auth.js";
import { asyncHandler } from "../lib/async-handler.js";
import { validateBody } from "../middleware/validate.js";
import type { Request } from "express";

const analyticsLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, message: "Too many analytics events" },
    standardHeaders: true,
    legacyHeaders: false,
}) as unknown as RequestHandler;

const vitalsLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: { success: false, message: "Too many vitals reports" },
    standardHeaders: true,
    legacyHeaders: false,
}) as unknown as RequestHandler;

const insertVitalSchema = z.object({
    name: z.enum(["LCP", "CLS", "INP", "FCP", "TTFB"]),
    value: z.number().min(0),
    rating: z.enum(["good", "needs-improvement", "poor"]),
    path: z.string().min(1).max(500),
});

/**
 * Detection logic for bots using Cloudflare headers and UA fallback.
 * https://developers.cloudflare.com/bots/concepts/bot-score/
 */
function isBotRequest(req: Request): boolean {
    const cfBotScore = req.headers["cf-bot-score"];
    const cfVerifiedBot = req.headers["cf-verified-bot"];
    const userAgent = req.headers["user-agent"]?.toLowerCase() || "";

    // 1. Cloudflare verified bots (Search engines, etc.)
    if (cfVerifiedBot === "true") return true;

    // 2. Cloudflare Bot Score (1-29 is likely automated/malicious)
    if (cfBotScore) {
        const score = parseInt(cfBotScore as string, 10);
        if (!isNaN(score) && score < 30) return true;
    }

    // 3. Fallback: Common bot signatures in User-Agent
    const botPatterns = [
        "bot", "crawler", "spider", "slurp", "lighthouse", "headless",
        "googlebot", "bingbot", "yandex", "baiduspider", "facebookexternalhit",
        "twitterbot", "rogerbot", "linkedinbot", "embedly", "quora link preview",
        "showyoubot", "outbrain", "pinterest/0.", "slackbot", "vkShare",
        "W3C_Validator", "redditbot", "Applebot", "WhatsApp"
    ];

    return botPatterns.some(pattern => userAgent.includes(pattern));
}


export function registerAnalyticsRoutes(app: Router) {
    // POST /analytics/track - Log an analytics event
    app.post(
        "/analytics/track",
        analyticsLimiter,
        validateBody(insertAnalyticsSchema),
        asyncHandler(async (req, res) => {
            if (isBotRequest(req)) {
                return res.status(202).json({ success: true, message: "Request accepted (bot filtered)" });
            }
            const event = await analyticsService.logEvent(req.body);
            res.status(201).json({
                success: true,
                message: "Event tracked successfully",
                data: event
            });
        })
    );

    // POST /analytics/vitals - Log a Core Web Vital metric
    app.post(
        "/analytics/vitals",
        vitalsLimiter,
        validateBody(insertVitalSchema),
        asyncHandler(async (req, res) => {
            if (isBotRequest(req)) {
                return res.status(204).end();
            }
            await analyticsService.logVital(req.body);
            res.status(204).end();
        })
    );

    // GET /analytics/summary - Get aggregated analytics for dashboard
    app.get(
        "/analytics/summary",
        isAuthenticated,
        asyncHandler(async (_req, res) => {
            const summary = await analyticsService.getSummary();
            res.json(summary);
        })
    );

    // GET /analytics/vitals - Get Core Web Vitals summary for dashboard
    app.get(
        "/analytics/vitals",
        isAuthenticated,
        asyncHandler(async (req, res) => {
            const days = req.query.days ? Number(req.query.days) : 7;
            const summary = await analyticsService.getVitalsSummary(days);
            res.json(summary);
        })
    );
}
