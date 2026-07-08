import { messageRepository } from "../repositories/message.repository.js";
import DOMPurify from "isomorphic-dompurify";
import type { Message, InsertMessage } from "@portfolio/shared";
import { logger } from "../lib/logger.js";

export class MessageService {
    private sanitize(text: string): string {
        return DOMPurify.sanitize(text);
    }

    /**
     * Retrieves all messages.
     * @returns Array of message objects
     */
    async getAll(limit = 100, offset = 0): Promise<Message[]> {
        return await messageRepository.findAll(limit, offset);
    }

    /**
     * Retrieves a single message by its ID.
     * @param id - The message ID
     * @returns The matching message or null if not found
     */
    async getById(id: number): Promise<Message | null> {
        return await messageRepository.findById(id);
    }

    /**
     * Creates a new message after sanitizing input and checking the honeypot field.
     * @param data - The message data including optional honeypot _bnt_id field
     * @returns The newly created message
     * @throws {Error} If the honeypot field is populated (spam detected)
     */
    async create(data: InsertMessage & { _bnt_id?: string }): Promise<Message> {
        // Honeypot check
        if (data._bnt_id) {
            logger.warn({ context: "security", service: "message", email: data.email }, "Spam detected via honeypot field");
            throw new Error("Message rejected");
        }

        // The _bnt_id field is only used for the honeypot check and is not part of the message data to be inserted.
        // Destructure it to exclude it from insertData.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _bnt_id: __bnt_id, ...insertData } = data;

        const sanitizedData: InsertMessage = {
            name: this.sanitize(insertData.name),
            email: this.sanitize(insertData.email),
            message: this.sanitize(insertData.message),
            subject: insertData.subject ? this.sanitize(insertData.subject) : "",
            projectType: insertData.projectType ? this.sanitize(insertData.projectType) : undefined,
            budget: insertData.budget ? this.sanitize(insertData.budget) : undefined,
            timeline: insertData.timeline ? this.sanitize(insertData.timeline) : undefined,
            attachmentUrl: insertData.attachmentUrl ? this.sanitize(insertData.attachmentUrl) : undefined,
            attachmentName: insertData.attachmentName ? this.sanitize(insertData.attachmentName) : undefined,
        };
        return await messageRepository.create(sanitizedData);
    }

    /**
     * Deletes a message by its ID.
     * @param id - The message ID to delete
     * @returns True if the message was deleted, false otherwise
     */
    async delete(id: number): Promise<boolean> {
        return await messageRepository.delete(id);
    }

    /**
     * Deletes multiple messages by their IDs.
     * @param ids - Array of message IDs to delete
     */
    async bulkDelete(ids: number[]): Promise<void> {
        await messageRepository.bulkDelete(ids);
    }
}

export const messageService = new MessageService();
