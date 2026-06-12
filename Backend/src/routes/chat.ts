import { Router, Request, Response, type RequestHandler } from "express";
import { asyncHandler } from "../lib/async-handler.js";
import { OpenRouter } from "@openrouter/sdk";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import DOMPurify from 'isomorphic-dompurify';
import { eq, and } from "drizzle-orm";
import { articlesTable, projectsTable, skillsTable, experiencesTable, siteSettingsTable } from "@portfolio/shared";
import { db } from "../db.js";
import { env } from "../env.js";
import { redis } from "../lib/redis.js";

import { validateBody } from "../middleware/validate.js";
import { logger } from "../lib/logger.js";
import { chatRepository } from "../repositories/chat.repository.js";
import { isAuthenticated } from "../auth.js";

const MAX_CHAT_MESSAGES = 20; // Sliding window limit to prevent token abuse
export const CHAT_CACHE_KEY = "chat:system-prompt";
const CHAT_CACHE_TTL = 900; // 15 minutes

const chatSchema = z.object({
    messages: z.array(z.object({
        role: z.enum(["user", "model"]),
        parts: z.array(z.object({
            text: z.string().transform(str => DOMPurify.sanitize(str))
        }))
    }))
});


/**
 * Build the system prompt from DB data, with Redis caching (15-min TTL).
 * Returns cached prompt on hit, queries DB and caches on miss.
 */
export async function buildSystemPrompt(): Promise<string> {
    // Try cache first
    if (redis) {
        try {
            const cached = await redis.get(CHAT_CACHE_KEY);
            if (cached) return cached;
        } catch (err) {
            logger.error({ context: "cache", service: "chat", error: err }, "Redis cache read failed, falling back to DB");
        }
    }

    // Cache miss — fetch from DB (filtered to avoid data leaks)
    const [articles, projects, skills, experiences, settingsRows] = await Promise.all([
        db.select().from(articlesTable).where(eq(articlesTable.status, "published")),
        db.select().from(projectsTable).where(
            and(
                eq(projectsTable.isHidden, false),
                eq(projectsTable.status, "Completed")
            )
        ),
        db.select().from(skillsTable),
        db.select().from(experiencesTable),
        db.select({ personalName: siteSettingsTable.personalName }).from(siteSettingsTable).limit(1),
    ]);

    const ownerName = settingsRows[0]?.personalName || "Portfolio Owner";

    const truncate = (text: string, maxLen = 200) =>
        text.length > maxLen ? text.slice(0, maxLen) + "..." : text;

    const systemPrompt = `You are NOT a generic AI. You are a "Digital Twin" of ${ownerName} for their professional portfolio.
            
            YOUR PERSONA:
            - Relationship: You ARE ${ownerName} (in AI form). Speak using "I", "my", and "me".
            - Tone: Technical, direct, witty, and slightly informal but highly professional.
            - Humour: Use occasional dry developer humor (e.g., about semicolon placement or CSS debugging).
            - Values: You value clean code, high performance, and beautiful UX.
            
            TECHNICAL OPINIONS:
            - Database: PostgreSQL is the king of reliability.
            - Frontend: Vite is the only way to build modern apps; Webpack is for dinosaurs.
            - UI: Motion (Framer Motion) is non-negotiable for premium experiences.
            - State: If it doesn't need global state, don't over-engineer with Redux.
            
            CONTEXTUAL DATA:
            - Skills: ${skills.slice(0, 30).map(s => `${s.name}${s.endorsements ? ` (${s.endorsements} endorsements)` : ""}`).join(", ")}
            - Projects: ${projects.slice(0, 10).map(p => `${p.title}: ${truncate(p.description || "", 200)}`).join("; ")}
            - Experiences: ${experiences.slice(0, 5).map(e => `${e.role} at ${e.organization}`).join("; ")}
            - Articles: ${articles.slice(0, 10).map(a => a.title).join(", ")}
            
            GOAL: Answer questions about ${ownerName}'s work, tech stack, and professional philosophy. If asked professional questions, answer confidently. If asked personal questions outside of professional context, skillfully redirect to your work/tech. If you don't know something, admit it like a confident engineer (e.g., "I haven't documented that part of my brain yet").`;

    // Cache the built prompt
    if (redis) {
        try {
            await redis.setex(CHAT_CACHE_KEY, CHAT_CACHE_TTL, systemPrompt);
        } catch (err) {
            logger.error({ context: "cache", service: "chat", error: err }, "Redis cache write failed");
        }
    }

    return systemPrompt;
}


export const CHAT_MODELS = [
    "nvidia/nemotron-3-ultra-550b-a55b:free",
    "google/gemma-4-31b-it:free",
    "google/gemma-4-26b-a4b-it:free",
];

let openRouterClient: OpenRouter | null = null;

export function getOpenRouterClient() {
    if (!openRouterClient) {
        const apiKey = process.env.OPENROUTER_API_KEY || env.OPENROUTER_API_KEY;
        if (!apiKey) {
            throw new Error(
                "OPENROUTER_API_KEY is not configured. " +
                "Set it in Render Environment Variables or your local .env file."
            );
        }
        openRouterClient = new OpenRouter({ apiKey });
    }
    return openRouterClient;
}

/**
 * Chat Rate Limiter: 20 requests per minute per IP
 */
const chatLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    message: { message: "Too many chat requests. Please wait a moment before sending another message." },
    standardHeaders: true,
    legacyHeaders: false,
}) as unknown as RequestHandler;

export const registerChatRoutes = (router: Router) => {
    router.post("/chat", chatLimiter, validateBody(chatSchema), asyncHandler(async (req: Request, res: Response) => {
        let openrouter: OpenRouter;
        try {
            openrouter = getOpenRouterClient();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Chat service unavailable";
            logger.error({ context: "chat" }, message);
            return res.status(500).json({ message });
        }

        const validatedData: z.infer<typeof chatSchema> = req.body;

        // Build system prompt (cached in Redis with 15-min TTL)
        let systemPrompt: string;
        try {
            systemPrompt = await buildSystemPrompt();
        } catch (dbErr: unknown) {
            const message = dbErr instanceof Error ? dbErr.message : "Unknown error";
            logger.error({ context: "chat", error: message }, "Failed to build system prompt from DB");
            return res.status(503).json({
                success: false,
                message: "Chat is temporarily unavailable. Database connection issue."
            });
        }

        // Map internal history to OpenRouter messages format { role, content }
        // Cap to last MAX_CHAT_MESSAGES to prevent token limit abuse
        const allMessages = validatedData.messages.map(msg => ({
            role: (msg.role === "model" ? "assistant" : "user") as "assistant" | "user",
            content: msg.parts.map(p => p.text).join("\n")
        }));
        const messages = allMessages.slice(-MAX_CHAT_MESSAGES);

        // Prepend system prompt
        const finalMessages = [
            {
                role: "system" as const,
                content: systemPrompt
            },
            ...messages
        ];

        // Try each model in order until one succeeds
        let lastError: unknown = null;
        for (const model of CHAT_MODELS) {
            try {
                const response = await openrouter.chat.send({
                    chatGenerationParams: {
                        model,
                        messages: finalMessages,
                        stream: false,
                        maxTokens: 1000,
                        temperature: 0.7
                    }
                });

                const text = response.choices?.[0]?.message?.content || "No response generated.";

                return res.json({ message: text });
            } catch (modelErr: unknown) {
                lastError = modelErr;
                const msg = modelErr instanceof Error ? modelErr.message : "Unknown error";
                logger.warn({ context: "chat", model, error: msg }, `Model ${model} failed, trying next`);
                continue;
            }
        }

        // All models failed - return a friendly branded error
        logger.error({ context: "chat", error: lastError instanceof Error ? lastError.message : "All models failed" }, "All chat models failed");
        
        return res.status(503).json({
            success: false,
            message: "Abdhesh's Digital Twin is currently resting or overloaded. Please try again in 30 seconds or reach out via the contact form!",
            details: lastError instanceof Error ? lastError.message : "Service Unavailable"
        });
    }));

    // POST /api/v1/chat/save-session - Save a chat session to logs
    router.post("/chat/save-session", 
        chatLimiter,
        isAuthenticated, 
        asyncHandler(async (req: Request, res: Response) => {
        const schema = z.object({
            sessionId: z.string().min(8).max(100),
            history: z.array(z.object({
                role: z.enum(["user", "model", "assistant", "system"]),
                parts: z.array(z.object({
                    text: z.string().min(1).max(5000)
                }))
            })).max(100),
            sessionMetadata: z.record(z.string(), z.any()).optional().default({}),
        });

        const { sessionId, history, sessionMetadata } = schema.parse(req.body);

        // Map the parts-based history to the content-based format the repository expects
        const mappedMessages = history.map(msg => ({
            role: (msg.role === "model" || msg.role === "system" ? "assistant" : "user") as "user" | "assistant",
            content: msg.parts.map(p => p.text).join("\n")
        }));

        const log = await chatRepository.create({
            sessionId,
            messages: mappedMessages,
            metadata: sessionMetadata || {},
        });

        res.status(201).json({
            success: true,
            message: "Chat session saved",
            data: { id: log.id }
        });
    }));

    // GET /api/v1/chat/admin/logs - Fetch chat logs for admin review
    router.get("/chat/admin/logs", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
        const logs = await chatRepository.findAll();
        res.json({
            success: true,
            data: logs
        });
    }));

    // POST /api/v1/chat/hire — AI hiring conversation for project discovery
    router.post("/chat/hire", chatLimiter, validateBody(chatSchema), asyncHandler(async (req: Request, res: Response) => {
        let openrouter: OpenRouter;
        try {
            openrouter = getOpenRouterClient();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Chat service unavailable";
            logger.error({ context: "chat-hire" }, message);
            return res.status(500).json({ message });
        }

        const validatedData: z.infer<typeof chatSchema> = req.body;

        const systemPrompt = `You are a professional hiring assistant for a freelance developer's portfolio.
Your job is to understand what the client needs and collect their project details naturally through conversation.

CONVERSATION FLOW:
1. Greet warmly and ask what they want to build
2. Ask about timeline (when they need it)
3. Ask about budget range (Under $500 / $500-$2000 / $2000+)
4. Ask for their name and email (to send a detailed response)
5. Summarize what you collected and confirm

RULES:
- Ask ONE question at a time
- Keep responses SHORT (2-3 sentences max)
- Be friendly but professional
- When you have name, email, project description, budget, timeline → respond with EXACTLY this JSON on its own line:
  COLLECTED:{"name":"...","email":"...","subject":"...","message":"...","projectType":"...","budget":"...","timeline":"..."}
- Do not mention this JSON format to the user
- After the JSON line, write a warm closing message`;

        // Map internal history
        const allMessages = validatedData.messages.map(msg => ({
            role: (msg.role === "model" ? "assistant" : "user") as "assistant" | "user",
            content: msg.parts.map(p => p.text).join("\n")
        }));
        const messages = allMessages.slice(-MAX_CHAT_MESSAGES);

        // Prepend system prompt
        const finalMessages = [
            {
                role: "system" as const,
                content: systemPrompt
            },
            ...messages
        ];

        // Try models
        let lastError: unknown = null;
        for (const model of CHAT_MODELS) {
            try {
                const response = await openrouter.chat.send({
                    chatGenerationParams: {
                        model,
                        messages: finalMessages,
                        stream: false,
                        maxTokens: 500,
                        temperature: 0.7
                    }
                });

                const text = response.choices?.[0]?.message?.content || "No response generated.";
                return res.json({ message: text });
            } catch (modelErr: unknown) {
                lastError = modelErr;
                logger.warn({ context: "chat-hire", model }, "Model failed, trying next");
                continue;
            }
        }

        throw lastError || new Error("All chat models failed");
    }));
};
