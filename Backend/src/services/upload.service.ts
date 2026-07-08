import { cloudinary } from "../lib/cloudinary.js";
import { recordAudit } from "../lib/audit.js";
import { fileTypeFromBuffer } from 'file-type';
import { logger } from "../lib/logger.js";

export interface UploadResult {
    url: string;
    publicId: string;
    format: string;
    originalName: string;
}

export class UploadService {
    /**
     * Validates and uploads a file to Cloudinary
     */
    static async uploadImage(buffer: Buffer, originalName: string): Promise<UploadResult> {
        // MAGIC-BYTE VALIDATION
        const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
        const type = await fileTypeFromBuffer(buffer);

        if (!type || !ALLOWED_MIME_TYPES.includes(type.mime)) {
            throw new Error(`Invalid file content. Expected image, got "${type?.mime || 'unknown'}".`);
        }

        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: 'portfolio_uploads',
                    allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'gif', 'avif'],
                    public_id: `project_${Date.now()}_${originalName.split('.')[0].replace(/[^\w-]/g, '')}`
                },
                (error, result) => {
                    if (error || !result) {
                        logger.error({ context: "upload", error }, "Cloudinary upload failed");
                        return reject(new Error(error?.message || "Cloudinary upload failed"));
                    }

                    const uploadData: UploadResult = {
                        url: result.secure_url,
                        publicId: result.public_id,
                        format: result.format,
                        originalName: originalName
                    };

                    // Audit log (A5)
                    recordAudit("CREATE", "upload", undefined, null, { ...uploadData });

                    resolve(uploadData);
                }
            );

            uploadStream.end(buffer);
        });
    }

    /**
     * Validates and uploads an attachment (image or PDF) to Cloudinary
     */
    static async uploadAttachment(buffer: Buffer, originalName: string): Promise<UploadResult> {
        // MAGIC-BYTE VALIDATION
        const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'application/pdf'];
        const type = await fileTypeFromBuffer(buffer);

        if (!type || !ALLOWED_MIME_TYPES.includes(type.mime)) {
            throw new Error(`Invalid file content. Expected image or PDF, got "${type?.mime || 'unknown'}".`);
        }

        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: 'portfolio_attachments',
                    resource_type: 'auto',
                    public_id: `attach_${Date.now()}_${originalName.split('.')[0].replace(/[^\w-]/g, '')}`
                },
                (error, result) => {
                    if (error || !result) {
                        logger.error({ context: "upload", error }, "Cloudinary upload failed");
                        return reject(new Error(error?.message || "Cloudinary upload failed"));
                    }

                    const uploadData: UploadResult = {
                        url: result.secure_url,
                        publicId: result.public_id,
                        format: result.format,
                        originalName: originalName
                    };

                    // Audit log (A5)
                    recordAudit("CREATE", "upload", undefined, null, { ...uploadData });

                    resolve(uploadData);
                }
            );

            uploadStream.end(buffer);
        });
    }
}
