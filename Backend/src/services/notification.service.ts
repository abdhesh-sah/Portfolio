import { Resend } from "resend";
import { env } from "../env.js";
import { logger } from "../lib/logger.js";
import { escapeHtml } from "../lib/escape.js";
import { emailQueue } from "../lib/queue.js";

export class NotificationService {
    /**
     * Non-blocking fallback for emails when Redis/Queue is unavailable.
     */
    private async sendDirectFallback(type: string, payload: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        if (!env.RESEND_API_KEY) {
            logger.error({ context: "notification" }, "RESEND_API_KEY not set - fallback failed");
            return;
        }
        try {
            const resend = new Resend(env.RESEND_API_KEY);
            if (type === "contact-notification") {
                await resend.emails.send({
                    from: env.CONTACT_EMAIL || "onboarding@resend.dev",
                    to: payload.targetEmail,
                    subject: `Portfolio Message: ${escapeHtml(payload.message.subject || "No Subject")}`,
                    html: `
                    <h3>New Message from Portfolio</h3>
                    <p><strong>Name:</strong> ${escapeHtml(payload.message.name)}</p>
                    <p><strong>Email:</strong> ${escapeHtml(payload.message.email)}</p>
                    <hr/>
                    <p><strong>Message:</strong></p>
                    <p style="white-space: pre-wrap;">${escapeHtml(payload.message.message)}</p>
                    ${payload.message.attachmentUrl ? `<hr/><p><strong>Attachment:</strong> <a href="${escapeHtml(payload.message.attachmentUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(payload.message.attachmentName || "View Attachment")}</a></p>` : ""}
                    `
                });
            } else if (type === "auto-reply") {
                const { emailTemplateService } = await import("./email-template.service.js");
                const templates = await emailTemplateService.getAll();
                const dynamicTemplate = templates.find(t => t.name.toLowerCase().includes('auto-reply') || t.name.toLowerCase().includes('inquiry'));

                let subject = "Thank you for reaching out!";
                let html = `
                    <p>Hi ${escapeHtml(payload.message.name)},</p>
                    <p>Thank you for your message. I have received it and will get back to you as soon as possible.</p>
                    <p>Best regards,<br/>Portfolio Admin</p>
                `;

                if (dynamicTemplate) {
                    subject = dynamicTemplate.subject;
                    html = dynamicTemplate.body.replace(/\{name\}/g, escapeHtml(payload.message.name));
                }

                await resend.emails.send({
                    from: env.CONTACT_EMAIL || "onboarding@resend.dev",
                    to: payload.message.email,
                    subject,
                    html
                });
            }
        } catch (e) {
             logger.error({ context: "notification", error: e }, "Direct Resend fallback failed");
        }
    }

    /**
     * Queues a contact notification and auto-reply.
     * Starts execution asynchronously to avoid blocking the HTTP response.
     */
    public sendContactNotification(message: import("@portfolio/shared").Message, adminEmail?: string) {
        const targetEmail = adminEmail || env.ADMIN_EMAIL;
        
        const queueEmail = async () => {
            if (emailQueue) {
                try {
                    await emailQueue.add("send-contact-email", {
                        type: "contact-notification",
                        payload: { message, targetEmail }
                    });
                    await emailQueue.add("send-auto-reply", {
                        type: "auto-reply",
                        payload: { message }
                    });
                } catch (err) {
                    logger.error({ context: "notification", error: err }, "Failed to queue email. Using fallback.");
                    await this.sendDirectFallback("contact-notification", { message, targetEmail });
                    await this.sendDirectFallback("auto-reply", { message });
                }
            } else {
                logger.warn({ context: "notification" }, "Queue missing. Using direct fallback.");
                await this.sendDirectFallback("contact-notification", { message, targetEmail });
                await this.sendDirectFallback("auto-reply", { message });
            }
        };

        // Fire and forget
        queueEmail().catch(err => {
            logger.error({ context: "notification", error: err }, "Unhandled error in email pipeline");
        });
    }
}

export const notificationService = new NotificationService();
