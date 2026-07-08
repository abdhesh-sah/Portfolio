import { Router, Request, Response } from "express";
import { z } from "zod";
import { contactLimiter } from "../lib/rate-limit.js";
import { messageService } from "../services/message.service.js";
import { insertMessageApiSchema } from "@portfolio/shared";
import { env } from "../env.js";
import { isAuthenticated } from "../auth.js";
import { asyncHandler } from "../lib/async-handler.js";
import DOMPurify from 'isomorphic-dompurify';
import { emailQueue } from "../lib/queue.js";
import { logger } from "../lib/logger.js";
import { recordAudit } from "../lib/audit.js";
import { parseIntParam } from "../lib/params.js";
import { validateBody } from "../middleware/validate.js";
import { messageSSE } from "../lib/sse.js";
import { notificationService } from "../services/notification.service.js";
import crypto from "crypto";
import multer from "multer";
import { UploadService } from "../services/upload.service.js";

const contactUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 1
    },
    fileFilter: (_req, file, cb) => {
        const ext = file.originalname.split('.').pop()?.toLowerCase();
        const allowedExtensions = [
            "pdf", "jpg", "jpeg", "png", "webp", "gif", "avif",
            "doc", "docx", "txt", "rtf", "xls", "xlsx", "csv",
            "zip", "rar", "7z",
            "js", "jsx", "ts", "tsx", "html", "css", "json", "py", "go", "rs", "cpp", "c", "h", "cs", "java", "sh", "md", "yaml", "yml", "xml"
        ];
        if (ext && allowedExtensions.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error("Invalid file type. Allowed: Images, PDF, Word, Text, Spreadsheets, ZIP/Archives, and Source Code."));
        }
    }
}).single("attachment");



export function registerMessageRoutes(app: Router) {
    // GET /messages/stream - SSE endpoint for real-time message notifications (admin only)
    app.get(
        "/messages/stream",
        isAuthenticated,
        (req: Request, res: Response) => {
            res.writeHead(200, {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no", // Disable nginx buffering
            });

            // Send initial connection event
            res.write(`event: connected\ndata: ${JSON.stringify({ status: "ok" })}\n\n`);

            const clientId = crypto.randomUUID();
            messageSSE.addClient(clientId, res);

            req.on("close", () => {
                messageSSE.removeClient(clientId);
            });
        }
    );

    app.get(
        "/messages",
        isAuthenticated,
        asyncHandler(async (req, res) => {
            const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
            const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
            const messages = await messageService.getAll(limit, offset);
            // Include pagination metadata in Headers so we don't break JSON array contract if not needed
            // Or return as array if that's what frontend expects
            res.json(messages);
        })
    );

    // POST /messages/bulk-delete - Bulk delete messages
    app.post(
        "/messages/bulk-delete",
        isAuthenticated,
        asyncHandler(async (req, res) => {
            const schema = z.object({ ids: z.array(z.number()).min(1).max(100) });
            const { ids } = schema.parse(req.body);
            await messageService.bulkDelete(ids);

            // Audit log (A2)
            recordAudit("DELETE", "message_bulk", undefined, null, { deletedIds: ids });

            res.status(204).send();
        })
    );

    // GET /messages/:id - Get single message
    app.get(
        "/messages/:id",
        isAuthenticated,
        asyncHandler(async (req, res) => {
            const id = parseIntParam(res, req.params.id, "message ID");
            if (id === null) return;
            const message = await messageService.getById(id);
            if (!message) {
                res.status(404).json({ success: false, message: "Message not found" });
                return;
            }
            res.json(message);
        })
    );

    // POST /messages - Create message (contact form)
    app.post(
        "/messages",
        contactLimiter,
        (req, res, next) => {
            /* eslint-disable @typescript-eslint/no-explicit-any */
            contactUpload(req as any, res as any, (err: any) => {
            /* eslint-enable @typescript-eslint/no-explicit-any */
                if (err) {
                    const multerErr = err as { code?: string };
                    if (multerErr.code === "LIMIT_FILE_SIZE") {
                        return res.status(413).json({ message: "File too large. Maximum size is 5MB." });
                    }
                    return res.status(400).json({ message: err.message });
                }
                next();
            });
        },
        validateBody(insertMessageApiSchema),
        asyncHandler(async (req, res) => {
            try {
                let attachmentUrl: string | undefined;
                let attachmentName: string | undefined;

                if (req.file) {
                    // Upload file to Cloudinary
                    const uploadResult = await UploadService.uploadAttachment(
                        req.file.buffer,
                        req.file.originalname
                    );
                    attachmentUrl = uploadResult.url;
                    attachmentName = uploadResult.originalName;
                }

                const message = await messageService.create({
                    ...req.body,
                    attachmentUrl,
                    attachmentName
                });
                logger.info({ context: "messages", name: message.name, email: message.email }, "New message received");

                // Emit SSE event for real-time admin notification
                messageSSE.emit("new-message", {
                    id: message.id,
                    name: message.name,
                    subject: message.subject,
                    createdAt: message.createdAt,
                });

                // Send response immediately
                res.status(201).json({
                    success: true,
                    message: "Message sent! We'll get back to you soon.",
                    data: message,
                });

                // Fire and forget notification pipeline (handles queue & fallback)
                notificationService.sendContactNotification(message);
            } catch (error: unknown) {
                if (error instanceof Error && error.message === "Message rejected") {
                    logger.warn({ context: "messages", email: req.body.email }, "Spam blocked (Honeypot filled)");
                    // Fake success to trick the bot
                    res.status(201).json({
                        success: true,
                        message: "Message sent! We'll get back to you soon.",
                        data: { id: 0, message: "blocked" },
                    });
                    return;
                }
                throw error;
            }
        })
    );

    // POST /messages/:id/reply - Reply to a message
    app.post(
        "/messages/:id/reply",
        isAuthenticated,
        asyncHandler(async (req, res) => {
            const id = parseIntParam(res, req.params.id, "message ID");
            if (id === null) return;

            const schema = z.object({
                subject: z.string().min(1),
                body: z.string().min(1),
            });

            const { subject, body } = schema.parse(req.body);

            const message = await messageService.getById(id);
            if (!message) {
                res.status(404).json({ success: false, message: "Message not found" });
                return;
            }

            if (!env.RESEND_API_KEY) {
                res.status(500).json({ success: false, message: "Email service not configured (RESEND_API_KEY missing)" });
                return;
            }

            // Removed unused resend instantiation as we use emailQueue now

            // Sanitize HTML before sending — block javascript: URIs and enforce secure links
            const sanitizedBody = DOMPurify.sanitize(body, {
                ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li'],
                ALLOWED_ATTR: ['href', 'target', 'rel'],
                FORBID_ATTR: [],
                ALLOW_DATA_ATTR: false,
            });
            // Post-process: strip javascript: hrefs and enforce rel="noopener noreferrer"
            const safeSanitizedBody = sanitizedBody
                .replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"')
                .replace(/<a\b([^>]*?)(\srel="[^"]*")?([^>]*?)>/gi, (match, p1, p2, p3) => {
                    // Remove any existing rel attribute and add the mandatory one
                    return `<a${p1}${p3} rel="noopener noreferrer">`;
                });

            if (emailQueue) {
                try {
                    await emailQueue.add("send-reply-email", {
                        type: "admin-reply",
                        payload: {
                            to: message.email,
                            subject: subject,
                            html: safeSanitizedBody,
                        }
                    });
                    logger.info({ context: "messages", to: message.email }, "Queued reply");

                    // Audit log (A2)
                    recordAudit("CREATE", "message_reply", id, null, { subject });

                    res.json({ success: true, message: "Reply queued successfully" });
                } catch (queueError: unknown) {
                    logger.error({ context: "messages", to: message.email, error: (queueError as Error).message }, "Failed to queue reply");
                    res.status(500).json({ success: false, message: `Failed to queue email: ${(queueError as Error).message}` });
                }
            } else {
                res.status(500).json({ success: false, message: "Email queue not configured (Redis required)" });
            }
        })
    );

    // DELETE /messages/:id - Delete message
    app.delete(
        "/messages/:id",
        isAuthenticated,
        asyncHandler(async (req, res) => {
            const id = parseIntParam(res, req.params.id, "message ID");
            if (id === null) return;
            const deleted = await messageService.delete(id);
            if (!deleted) {
                res.status(404).json({ success: false, message: "Message not found" });
                return;
            }

            // Audit log (A2)
            recordAudit("DELETE", "message", id);

            res.status(204).send();
        })
    );
}
