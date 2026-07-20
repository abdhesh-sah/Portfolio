import { Queue, Worker, Job } from "bullmq";
import { Redis } from "ioredis";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Request } from "express";
import { Resend } from "resend";
import { env } from "../env.js";
import { logger } from "./logger.js";
import { isLocalRedisUrl, formatRedisUrlForLog } from "./redis.js";
import { createScopeWorker } from "../workers/scope.worker.js";
import { escapeHtml } from "./escape.js";
import { emailTemplateService } from "../services/email-template.service.js";
import type { EmailTemplate } from "@portfolio/shared";

// BullMQ requires dedicated ioredis connections with maxRetriesPerRequest: null.
// Queue and Worker each need their own connection (BullMQ internal requirement).
// These are intentionally separate from the app-level redis singleton in redis.ts.
// WARNING: Calling this function multiple times (for each queue and worker)
// creates multiple TCP connections. In environments with strict connection limits
// (like free-tier managed Redis), this can exhaust connection limits quickly.
function getRedisConnection() {
    return new Redis(env.REDIS_URL || "redis://localhost:6379", {
        maxRetriesPerRequest: null, // BullMQ requires this to be null
        retryStrategy(times) {
            return Math.min(times * 50, 2000);
        }
    });
}

// bullmq bundles its own ioredis — cast via the ConnectionOptions shape it actually expects
 
function toBullMQConnection(r: ReturnType<typeof getRedisConnection>) {
    return r as unknown as import("bullmq").ConnectionOptions;
}

// Ensure BullMQ is only active if REDIS validation passes or running locally
const isProd = process.env.NODE_ENV === "production";
const hasRedisUrl = !!env.REDIS_URL;
const isProdLocalRedis = isProd && hasRedisUrl && isLocalRedisUrl(env.REDIS_URL as string);

const canUseRedis = !isProd || (hasRedisUrl && !isProdLocalRedis);

export let emailQueue: Queue | null = null;
export let scopeQueue: Queue | null = null;
export let emailWorker: Worker | null = null;
export let scopeWorker: Worker | null = null;

/** Shared Resend client — instantiated once when queues initialize, not per-job */
let resend: Resend | null = null;

/** Simple in-memory template cache */
let templateCache: EmailTemplate[] | null = null;
let lastTemplateFetch = 0;
const TEMPLATE_CACHE_TTL = 60 * 1000; // 1 minute

async function getCachedTemplates() {
    const now = Date.now();
    if (!templateCache || (now - lastTemplateFetch > TEMPLATE_CACHE_TTL)) {
        templateCache = await emailTemplateService.getAll();
        lastTemplateFetch = now;
    }
    return templateCache;
}

interface EmailParams {
    from: string;
    to: string;
    subject: string;
    html?: string;
    text?: string;
    react?: unknown;  
    attachments?: unknown[];
}

/** Strategy Pattern for different email types */
const EMAIL_STRATEGIES: Record<string, (payload: any) => Promise<EmailParams> | EmailParams> = { // eslint-disable-line @typescript-eslint/no-explicit-any
    "contact-notification": (payload: { targetEmail: string; message: { subject?: string; name: string; email: string; message: string; attachmentUrl?: string | null; attachmentName?: string | null } }) => ({
        from: env.CONTACT_EMAIL,
        to: payload.targetEmail,
        subject: `Portfolio Message: ${escapeHtml(payload.message.subject || "No Subject")}`,
        html: `
            <h3>New Message from Portfolio</h3>
            <p><strong>Name:</strong> ${escapeHtml(payload.message.name)}</p>
            <p><strong>Email:</strong> ${escapeHtml(payload.message.email)}</p>
            <p><strong>Subject:</strong> ${escapeHtml(payload.message.subject || "")}</p>
            <hr/>
            <p><strong>Message:</strong></p>
            <p style="white-space: pre-wrap;">${escapeHtml(payload.message.message)}</p>
            ${payload.message.attachmentUrl ? `<hr/><p><strong>Attachment:</strong> <a href="${escapeHtml(payload.message.attachmentUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(payload.message.attachmentName || "View Attachment")}</a></p>` : ""}
        `,
    }),
    "admin-reply": (payload) => ({
        from: env.CONTACT_EMAIL,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
    }),
    "admin-notification": (payload: { to?: string; subject: string; html: string; attachments?: unknown[] }) => ({
        from: env.CONTACT_EMAIL,
        to: payload.to || env.ADMIN_EMAIL,
        subject: payload.subject,
        html: payload.html,
        attachments: payload.attachments,
    }),
    "client-notification": (payload: { to: string; subject: string; html: string; attachments?: unknown[] }) => ({
        from: env.CONTACT_EMAIL,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        attachments: payload.attachments,
    }),
    "auto-reply": async (payload: { message: { name: string; email: string } }) => {
        const { message } = payload;
        const templates = await getCachedTemplates();
        const dynamicTemplate = templates.find(t => 
            t.name.toLowerCase().includes('auto-reply') || 
            t.name.toLowerCase().includes('inquiry')
        );

        let subject = "Thank you for reaching out!";
        let html = `
            <p>Hi ${escapeHtml(message.name)},</p>
            <p>Thank you for your message. I have received it and will get back to you as soon as possible.</p>
            <p>Best regards,<br/>Portfolio Admin</p>
        `;

        if (dynamicTemplate) {
            subject = dynamicTemplate.subject;
            html = dynamicTemplate.body.replace(/\{name\}/g, escapeHtml(message.name));
        }

        return {
            from: env.CONTACT_EMAIL,
            to: message.email,
            subject,
            html,
        };
    }
};

export function initQueues() {
    if (isProd && (!hasRedisUrl || isProdLocalRedis)) {
        logger.warn(
            {
                context: "queue",
                redisConfigured: hasRedisUrl,
                redisUrl: formatRedisUrlForLog(env.REDIS_URL),
            },
            "Queue disabled in production: REDIS_URL is missing or points to localhost. Set REDIS_URL to a managed Redis endpoint (recommended rediss://...) or unset REDIS_URL to disable background jobs intentionally."
        );
    }

    if (!canUseRedis || process.env.NODE_ENV === "test") {
        if (process.env.NODE_ENV === "test") {
            logger.info({ context: "queue" }, "Skipping BullMQ initialization in test mode (bypasses version checks)");
        }
        return;
    }

    logger.info({ context: "queue" }, "Initializing BullMQ queues and workers...");


    const defaultJobOptions = {
        attempts: 5,
        backoff: {
            type: "exponential",
            delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false, // Keep failed jobs for manual inspection
    };

    emailQueue = new Queue("email", {
        connection: toBullMQConnection(getRedisConnection()),
        defaultJobOptions
    });

    scopeQueue = new Queue("scope", {
        connection: toBullMQConnection(getRedisConnection()),
        defaultJobOptions
    });

    // Instantiate Resend client once for the lifetime of the worker
    if (env.RESEND_API_KEY) {
        resend = new Resend(env.RESEND_API_KEY);
    }

    emailWorker = new Worker("email", async (job: Job) => {
        const { type, payload } = job.data;

        if (!resend) {
            logger.warn({ context: "queue" }, "Skipping email: RESEND_API_KEY not set");
            return;
        }

        const strategy = EMAIL_STRATEGIES[type];
        if (!strategy) {
            throw new Error(`Unknown job type: ${type}`);
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const params = await strategy(payload) as any;
        const { data, error } = await resend.emails.send(params);

        if (error) {
            throw new Error(`Failed to send ${type}: ${error.message}`);
        }
        return data;
    }, {
        connection: toBullMQConnection(getRedisConnection())
    });

    scopeWorker = createScopeWorker(getRedisConnection() as unknown as import("ioredis").Redis);

    if (emailWorker) {
        emailWorker.on("completed", (job) => {
            logger.info({ context: "queue", jobId: job.id, type: job.data.type }, "Job completed successfully");
        });

        emailWorker.on("failed", (job, err) => {
            logger.error({ context: "queue", jobId: job?.id, type: job?.data?.type, error: err }, "Job failed");
        });
    }

    logger.info({ context: "queue" }, "BullMQ queues and workers initialized");
}
