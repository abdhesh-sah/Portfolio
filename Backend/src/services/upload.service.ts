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
        const type = await fileTypeFromBuffer(buffer);
        const ext = originalName.split('.').pop()?.toLowerCase() || '';

        const BINARY_MIME_MAP: Record<string, string[]> = {
            pdf: ['application/pdf'],
            doc: ['application/msword'],
            docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
            xls: ['application/vnd.ms-excel'],
            xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
            zip: ['application/zip', 'application/x-zip-compressed'],
            rar: ['application/x-rar-compressed', 'application/vnd.rar'],
            '7z': ['application/x-7z-compressed'],
            png: ['image/png'],
            jpg: ['image/jpeg'],
            jpeg: ['image/jpeg'],
            webp: ['image/webp'],
            gif: ['image/gif'],
            avif: ['image/avif'],
        };

        const CODE_EXTENSIONS = new Set([
            'js', 'jsx', 'ts', 'tsx', 'html', 'css', 'json', 'py', 'go', 'rs', 'cpp', 'c', 'h', 'cs', 'java', 'sh', 'md', 'yaml', 'yml', 'xml', 'txt', 'csv', 'rtf'
        ]);

        if (CODE_EXTENSIONS.has(ext)) {
            // Code and text files are plain text, so they don't have binary magic bytes.
            // Check for null bytes to ensure no malicious binary file is renamed to a code extension.
            const isBinary = buffer.slice(0, 1024).includes(0);
            if (isBinary) {
                throw new Error("Invalid file content. Binary data detected in code/text file.");
            }
        } else if (BINARY_MIME_MAP[ext]) {
            // Verify binary signature matches the extension
            if (!type || !BINARY_MIME_MAP[ext].includes(type.mime)) {
                throw new Error(`Invalid file content for .${ext} extension.`);
            }
        } else {
            throw new Error(`File extension .${ext} is not supported.`);
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
