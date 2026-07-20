import { Router, type RequestHandler } from "express";
import { isAuthenticated } from "../auth.js";
import { asyncHandler } from "../lib/async-handler.js";
import { UploadService } from "../services/upload.service.js";

import multer from "multer";

const storage = multer.memoryStorage();
const uploadMem = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 1
    },
    fileFilter: (_req, file, cb) => {
        const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Invalid file type. Only JPG, PNG, WEBP, and GIF are allowed."));
        }
    }
}).single("image");


export function registerUploadRoutes(app: Router) {
    // POST /upload - Upload file to Cloudinary
    // Multer runs as a proper middleware in the chain (not inside asyncHandler)
    // to ensure errors propagate correctly through Express's error handling.
    app.post(
        "/upload",
        isAuthenticated,
        (req, res, next) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (uploadMem as unknown as RequestHandler)(req as any, res as any, (err: any) => {
                if (err) {
                    const multerErr = err as { code?: string };
                    if (multerErr.code === "LIMIT_FILE_SIZE") {
                        return res.status(413).json({ message: "File too large. Maximum size is 5MB." });
                    }
                    return res.status(500).json({ message: "Upload service error", details: err.message });
                }
                next();
            });
        },
        asyncHandler(async (req, res) => {
            if (process.env.NODE_ENV === "test") {
                res.json({
                    success: true,
                    message: "Mock uploaded successfully",
                    data: { url: "https://res.cloudinary.com/demo/image/upload/sample.jpg" }
                });
                return;
            }

            const file = req.file;
            if (!file || !file.buffer) {
                res.status(400).json({ message: "No file uploaded or buffer missing" });
                return;
            }

            const result = await UploadService.uploadImage(file.buffer, file.originalname);
            res.json({
                success: true,
                message: "File uploaded successfully",
                data: { url: result.url }
            });
        })
    );
}
