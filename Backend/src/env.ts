import { z } from "zod";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const __filename = fileURLToPath(import.meta.url);

// In production (e.g. Render), env vars come from the platform — .env files are gitignored.
// Only load .env files if they exist on disk (local development).
const rootDir = process.cwd();
let envFile = ".env";
if (process.env.NODE_ENV === "production") envFile = ".env.production";
if (process.env.NODE_ENV === "test") envFile = ".env.test";

// Resolve the .env file path. When running via `npm -w Backend` from the
// monorepo root, process.cwd() is the root, not Backend/. We therefore check
// multiple candidate directories so the correct file is always found.
const candidateDirs = [
    rootDir,
    path.join(rootDir, "Backend"),      // monorepo root → Backend/
];

function findEnvFile(filename: string): string | null {
    for (const dir of candidateDirs) {
        const candidate = path.join(dir, filename);
        if (fs.existsSync(candidate)) return candidate;
    }
    return null;
}

const envPath = findEnvFile(envFile);

if (envPath) {
    process.stdout.write(`[ENV] Loading variables from: ${envPath}\n`);
    dotenv.config({ path: envPath });
} else {
    // Try fallback .env
    const fallback = findEnvFile(".env");
    if (fallback) {
        process.stdout.write(`[ENV] Loading variables from fallback: ${fallback}\n`);
        dotenv.config({ path: fallback });
    } else {
        console.warn("[ENV] No .env file found in root. Relying on platform environment variables.");
    }
}

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.string().default("5000").transform(Number),
    DATABASE_URL: z.string().url("Valid DATABASE_URL is required"),
    RESEND_API_KEY: z.string().optional(),
    REDIS_URL: z.string().optional(),
    FRONTEND_URL: z.string().optional(),
    JWT_SECRET: z.string().min(64, "JWT_SECRET must be at least 64 characters"),
    JWT_REFRESH_SECRET: z.string().min(64, "JWT_REFRESH_SECRET must be at least 64 characters"),
    ADMIN_PASSWORD: z.string().min(16, "ADMIN_PASSWORD must be at least 16 characters"),
    ADMIN_EMAIL: z.string().email(),
    CONTACT_EMAIL: z.string().email(),
    GEMINI_API_KEY: z.string().optional(),
    OPENROUTER_API_KEY: z.string().optional(),
    CLOUDINARY_CLOUD_NAME: z.string().optional(),
    CLOUDINARY_API_KEY: z.string().optional(),
    CLOUDINARY_API_SECRET: z.string().optional(),
    LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
    SENTRY_DSN: z.string().optional(),
    SENTRY_ENVIRONMENT: z.string().optional(),
    RENDER_DEPLOY_HOOK_URL: z.string().url().optional(),
    BACKEND_RENDER_URL: z.string().url().optional(),
    GITHUB_USERNAME: z.string().optional(),
    GITHUB_TOKEN: z.string().optional(),
    TRUST_PROXY: z.string().default("1").transform(Number),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
    try {
        const parsed = envSchema.parse(process.env);

        if (parsed.NODE_ENV === "production") {
            if (!parsed.RESEND_API_KEY) {
                console.warn("[ENV] RESEND_API_KEY not set. Email sending will fail in production.");
            }
        }

        return parsed;
    } catch (err) {
        if (err instanceof z.ZodError) {
            const missing = err.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
            process.stderr.write(`[ENV] Environment validation failed: ${missing}\n`);
            process.stderr.write("[ENV] Please check your .env file and ensure all required variables are set correctly.\n");
            process.exit(1);
        }
        throw err;
    }
}

// Export a singleton validated env object
export const env = validateEnv();
