import express, { type Request, Response, NextFunction, type RequestHandler } from "express";
import * as Sentry from "@sentry/node";
import { env } from "./env.js";
import { createServer } from "http";
import cors from "cors";
import helmet from "helmet";
import { registerRoutes } from "./routes.js";
import compression from "compression";
import cookieParser from "cookie-parser";
import { checkDatabaseHealth } from "./db.js";
import { emailQueue, emailWorker, scopeQueue, scopeWorker, initQueues } from "./lib/queue.js";
import { redis, RedisClient } from "./lib/redis.js";
import { logger } from "./lib/logger.js";
import { bootstrapDatabaseSchema } from "./lib/schema-bootstrap.js";
import { nonceMiddleware } from "./middleware/nonce.js";

import { globalLimiter } from "./lib/rate-limit.js";
import { startHealthMonitor, stopHealthMonitor } from "./lib/circuit-breaker.js";
import { dbGuard } from "./middleware/db-guard.js";
import { timeoutGuard } from "./middleware/timeout.js";
import { versionGuard } from "./middleware/version-guard.js";

import { randomUUID } from "crypto";

const app = express();
let isReady = false;
let keepAliveInterval: ReturnType<typeof setInterval> | null = null;
app.set("trust proxy", env.TRUST_PROXY);
const httpServer = createServer(app);


app.use((req: Request, res: Response, next: NextFunction) => {
  req.id = randomUUID();
  res.setHeader("X-Request-ID", req.id);
  next();
});

// Guard all routes except /ping and /health/deep until server is fully ready
app.use((req: Request, res: Response, next: NextFunction): void => {
  if (!isReady && req.path !== "/ping" && !req.path.startsWith("/health/deep")) {
    res.status(503).json({
      error: {
        message: "Server is initializing",
        status: 503,
        context: "startup"
      }
    });
    return;
  }
  next();
});

const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.ADDITIONAL_ALLOWED_ORIGIN,
  ...(process.env.NODE_ENV !== "production" ? [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
    "http://127.0.0.1:5173",
    "http://[::1]:5173",
    "http://[::1]:4173",
    "http://localhost:3000",
    "http://localhost:8080",
  ] : []),
].filter((origin): origin is string => Boolean(origin));

app.use(compression() as unknown as RequestHandler);
app.use(cookieParser() as unknown as RequestHandler);
app.use(nonceMiddleware);

// ── Global Hardening Middlewares ──
app.use(timeoutGuard);          // Enforce 10s request timeout
app.use("/api", versionGuard);  // Enforce /api/v1 prefix

app.use("/api/v1", globalLimiter);
app.use("/api/v1", dbGuard);

// Harden CORS
app.use(
  cors((req: Request, callback: (err: Error | null, options?: cors.CorsOptions) => void) => {
    const origin = req.header("Origin");

    // Allow non-browser requests (health checks, monitoring, cURL) — they have no Origin
    if (!origin) {
      const secFetch = req.header("sec-fetch-site");
      // Allow if it's not a browser request or if it's a same-origin request (proxy)
      if (secFetch && secFetch !== 'none' && secFetch !== 'same-origin') {
        logger.warn({
          path: req.path,
          secFetch,
          userAgent: req.header("user-agent"),
          requestId: req.id
        }, "Browser-like request missing Origin header");

        return callback(null, { origin: false });
      }
      return callback(null, { origin: true, credentials: true });
    }

    const isAllowed = allowedOrigins.includes(origin) ||
      (process.env.NODE_ENV !== "production" && (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:") || origin.startsWith("http://[::1]:"))) ||
      (process.env.BACKEND_RENDER_URL ? origin === process.env.BACKEND_RENDER_URL : false);

    if (isAllowed) {
      callback(null, {
        origin: true,
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token", "x-client-token", "Cache-Control", "Pragma"]
      });
    } else {
      logger.warn({ origin }, "CORS blocked origin");
      callback(null, { origin: false });
    }
  })
);


// Tighten Helmet CSP with Nonces
app.use(
  helmet({
    hidePoweredBy: true, // Remove X-Powered-By in all environments
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "script-src": [
          "'self'",
          "https://www.googletagmanager.com",
          "https://infird.com",
          (__req: unknown, res: unknown) => `'nonce-${(res as { locals: { nonce: string } }).locals.nonce}'`
        ],
        "object-src": ["'none'"],
        "connect-src": [
          "'self'",
          "https://api.github.com",
          ...(process.env.BACKEND_URL ? [process.env.BACKEND_URL] : []),
          "https://www.google-analytics.com",
          "https://region1.google-analytics.com"
        ],
        "img-src": [
          "'self'",
          "data:",
          "https:",
          "http:",
          "https://res.cloudinary.com",
          "https://*.cloudinary.com",
        ],
        "style-src": [
          "'self'",
          "https://fonts.googleapis.com",
          "https://api.fontshare.com",
          (__req: unknown, res: unknown) => `'nonce-${(res as { locals: { nonce: string } }).locals.nonce}'`
        ],
        "font-src": ["'self'", "https://fonts.gstatic.com", "https://cdn.fontshare.com"],
        "frame-ancestors": ["'none'"],
        "form-action": ["'self'"],
        "report-uri": ["/api/v1/csp-report"],
      },
    },
    crossOriginEmbedderPolicy: process.env.NODE_ENV === "production",
    crossOriginOpenerPolicy: process.env.NODE_ENV === "production",
    crossOriginResourcePolicy: { policy: "cross-origin" },
    strictTransportSecurity: process.env.NODE_ENV === "production" ? {
      maxAge: 63072000,
      includeSubDomains: true,
      preload: true,
    } : false,
  })
);

// Reduce Payload Limits
app.use(
  express.json({
    limit: "1mb",
    verify: (req: Request, _res: Response, buf: Buffer) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: false, limit: "1mb" }));

// Request Logger with ID
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on("finish", () => {
    if (req.path.startsWith("/api")) {
      const duration = Date.now() - start;
      logger.info({
        requestId: req.id,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration: `${duration}ms`,
      }, `Request processed`);
    }
  });
  next();
});

// Root route — friendly landing for direct visits
app.get("/", (_req: Request, res: Response) => {
  res.json({
    name: "Portfolio API",
    version: "2.0.0",
    status: "running",
    docs: "/health for health check, /api/* for API endpoints",
  });
});

// Lightweight liveness probe — used by Render's deploy health check.
// Must NOT touch the database so it stays fast even when Neon is cold.
app.get("/ping", (_req: Request, res: Response): void => {
  if (!isReady && process.env.NODE_ENV === "test") {
    res.status(503).json({ status: "starting" });
    return;
  }
  res.status(200).json({ status: "ok" });
});

// Fallback legacy health check for manual Render configurations
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

// Keep-alive endpoint — intentionally DB-FREE.
// Any external cron (UptimeRobot, cron-job.org) pointing here gets a 200
// without touching Postgres, so Neon can suspend between real requests.
// To keep Render's web service awake, point crons at /ping instead.
app.get("/api/v1/keep-alive", (_req: Request, res: Response) => {
  res.status(200).json({ status: "alive", timestamp: Date.now() });
});

// Sentry debug route (for verifying error capture pipeline)
// Guarded to only run in development/staging, never production
if (process.env.NODE_ENV !== "production") {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.get("/api/v1/debug-sentry", (_req: Request, _res: Response) => {
    throw new Error("My first Sentry error!");
  });
}

async function getRedisHealthSafe(): Promise<{ healthy: boolean; message: string }> {
  try {
    return await RedisClient.checkHealth();
  } catch (error: unknown) {
    return {
      healthy: false,
      message: error instanceof Error ? error.message : "Redis health check failed",
    };
  }
}


async function getHealthStatus() {
  const dbHealth = await checkDatabaseHealth();
  const redisHealth = await getRedisHealthSafe();
  const isHealthy = dbHealth.healthy && redisHealth.healthy;

  return {
    status: isHealthy ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: dbHealth.healthy ? "up" : "down",
      redis: redisHealth.healthy ? "up" : "down",
    },
    version: process.env.npm_package_version || "2.0.0",
  };
}

// Deep health check — queries the DB and Redis.
// NOT used by Render's health probe (that hits /ping which is DB-free).
// Available for manual debugging / on-demand monitoring only.
app.get("/health/deep", async (_req: Request, res: Response) => {
  const health = await getHealthStatus();
  res.status(200).json(health);
});

app.get("/api/v1/health", async (_req: Request, res: Response) => {
  const health = await getHealthStatus();
  res.status(200).json(health);
});


function setupGracefulShutdown() {
  const shutdown = async (signal: string) => {
    logger.info({ context: "shutdown" }, `${signal} received, shutting down...`);

    // Stop keep-alive self-ping
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval);
      keepAliveInterval = null;
      logger.info({ context: "shutdown" }, "Keep-alive cron stopped");
    }

    httpServer.close(() => {
      logger.info({ context: "shutdown" }, "HTTP server closed");
    });

    const forceTimer = setTimeout(() => {
      logger.info({ context: "shutdown" }, "Forced shutdown due to timeout");
      process.exit(1);
    }, 10000);
    forceTimer.unref();

    try {
      // Close database pool
      const { closePool } = await import("./db.js");
      await closePool();
      logger.info({ context: "shutdown" }, "Database pool closed");

      try {
        if (emailQueue) await emailQueue.close();
        if (emailWorker) await emailWorker.close();
        if (scopeQueue) await scopeQueue.close();
        if (scopeWorker) await scopeWorker.close();

        // Stop circuit breaker health monitor
        stopHealthMonitor();

        // Disconnect main Redis client
        if (redis) {
          await redis.quit();
        }
        logger.info({ context: "shutdown" }, "Redis and queues closed");
      } catch (qErr) {
        logger.error({ context: "shutdown", error: qErr }, `Error closing Redis/Queue`);
      }

      process.exit(0);
    } catch (err) {
      logger.error({ context: "shutdown", error: err }, `Error during shutdown`);
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  // Handle unhandled rejections and exceptions
  process.on("unhandledRejection", (reason: unknown) => {
    logger.fatal({ context: "crash", error: reason }, "UNHANDLED REJECTION");
    // Special console log to ensure it's seen in Playwright/Vite output
    console.error("\n[BACKEND] UNHANDLED REJECTION:", reason);
    process.exit(1);
  });

  process.on("uncaughtException", (error: Error) => {
    logger.fatal({ context: "crash", error }, "UNCAUGHT EXCEPTION");
    console.error("\n[BACKEND] UNCAUGHT EXCEPTION:", error);
    process.exit(1);
  });
}

async function initDatabaseInBackground() {
  logger.info({ context: "startup" }, "Ensuring database is ready (background loop)...");
  const maxAttempts = 60; // 2 minutes max wait
  let attempts = 0;
  let dbReady = false;

  while (attempts < maxAttempts && !dbReady) {
    try {
      const health = await checkDatabaseHealth();
      if (health.healthy) {
        dbReady = true;
      } else {
        attempts++;
        if (attempts < maxAttempts) {
          logger.info({ context: "startup" }, `Database not ready (${health.message}), retrying (${attempts}/${maxAttempts}) in background...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    } catch (err: unknown) {
      attempts++;
      const message = err instanceof Error ? err.message : "Unknown error";
      logger.info({ context: "startup" }, `Database error during connection check (${message}), retrying (${attempts}/${maxAttempts})...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  if (!dbReady) {
    logger.error({ context: "startup" }, "Database failed to become ready in the background. Server will remain in degraded mode.");
    if (process.env.NODE_ENV === "test") {
      process.exit(1);
    }
    return;
  }

  logger.info({ context: "startup" }, "Database is ready. Running migrations in background...");
  let migrationAttempts = 0;
  let migrationsComplete = false;
  while (migrationAttempts < 3 && !migrationsComplete) {
    try {
      await bootstrapDatabaseSchema();
      migrationsComplete = true;
      logger.info({ context: "startup" }, "Migrations complete");
    } catch (migErr) {
      migrationAttempts++;
      const message = migErr instanceof Error ? migErr.message : "Unknown error";
      logger.error({ context: "startup", attempt: migrationAttempts, error: message }, "Migration failed");
      if (migrationAttempts < 3) {
        logger.info({ context: "startup" }, "Retrying migrations in 5 seconds...");
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        logger.error({ context: "startup" }, "Migrations failed after maximum attempts. Server will remain in degraded mode.");
        if (process.env.NODE_ENV === "test") {
          process.exit(1);
        }
      }
    }
  }

  if (migrationsComplete) {
    isReady = true;
    logger.info({ context: "startup" }, "Server fully ready");
  }
}

// ==================== MAIN STARTUP ====================
async function startServer() {
  try {
    logger.info({ context: "startup" }, "Starting server...");

    // ── Step 1: Bind the port FIRST so Render detects the service immediately ──
    const port = parseInt(process.env.PORT || "5000", 10);
    const host = process.env.NODE_ENV === "test" ? "127.0.0.1" : "0.0.0.0";

    // In production, we bind early for Render heartbeat.
    // In test, we might choose to bind late, but Playwright config expects it to bind while it's starting.
    // So let's keep early binding but make sure the /health endpoint is the source of truth.
    await new Promise<void>((resolve, reject) => {
      httpServer.on("error", (err: Error & { code?: string }) => {
        if (err.code === "EADDRINUSE") {
          logger.fatal({ context: "startup", port }, "Port already in use");
        } else {
          logger.fatal({ context: "startup", error: err }, "Server failed to start");
        }
        reject(err);
      });

      httpServer.listen(port, host, () => {
        logger.info({ context: "startup", port, host }, `Server listening on ${host}:${port}`);
        resolve();
      });
    });

    // ── Step 2: Register API routes ──
    // Registering routes BEFORE the DB check ensures the server responds to probes (e.g. 404 vs 500)
    // and satisfies Playwright's readiness monitor even during a cold start.
    logger.info({ context: "startup" }, "Registering API routes...");
    registerRoutes(app);
    logger.info({ context: "startup" }, "API routes registered");

    // ── Step 3: Initialize background queues and workers ──
    initQueues();

    // ── Step 4: Start circuit breaker health monitor ──
    // Start early so it begins monitoring database connectivity status
    startHealthMonitor();

    // ── Step 5: Production Safety Checks ──
    if (process.env.NODE_ENV === "production") {
      if (env.FRONTEND_URL && (env.FRONTEND_URL.includes("localhost") || env.FRONTEND_URL.includes("127.0.0.1"))) {
        logger.warn({ context: "startup", frontendUrl: env.FRONTEND_URL }, "CRITICAL: FRONTEND_URL is set to localhost in production environment!");
      }
    }

    // Sentry Error Handler (must be before custom error handlers)
    if (env.SENTRY_DSN) {
      Sentry.setupExpressErrorHandler(app);
    }

    // Global Error Handler
    app.use(
      (error: unknown, req: Request, res: Response, _next: NextFunction) => { // eslint-disable-line @typescript-eslint/no-unused-vars
        const err = error as Error & { status?: number; statusCode?: number; errors?: unknown };
        const status = err.status || err.statusCode || 500;
        const message = (status === 500 && process.env.NODE_ENV !== "development") ? "Internal Server Error" : err.message;

        logger.error({
          requestId: req.id,
          status,
          error: err.message,
          stack: env.NODE_ENV === "development" ? err.stack : undefined,
        }, `Global Error Handler`);

        if (env.SENTRY_DSN && status >= 500) {
          Sentry.captureException(err);
        }

        res.status(status).json({
          error: {
            message,
            status,
            ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
          }
        });
      }
    );

    // SETUP GRACEFUL SHUTDOWN
    setupGracefulShutdown();

    // ── Step 6: Trigger background database connection and migration initialization ──
    // This allows the server to bind to the port immediately and satisfy the hosting platform's
    // startup check even if the database is experiencing cold starts or quota limits.
    initDatabaseInBackground().catch((err: unknown) => {
      logger.fatal({ context: "startup", error: err instanceof Error ? err.message : err }, "Unhandled error in background database initialization");
    });

    // ── Step 7: Start keep-alive cron (production only) ──
    // Self-ping every 10 minutes to prevent Render free-tier from sleeping.
    if (env.NODE_ENV === "production") {
      const KEEP_ALIVE_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
      const selfUrl = env.BACKEND_RENDER_URL
        ? `${env.BACKEND_RENDER_URL.replace(/\/$/, "")}/ping`
        : `http://localhost:${port}/ping`;

      keepAliveInterval = setInterval(async () => {
        try {
          const res = await fetch(selfUrl);
          const data = await res.json() as { status: string };
          logger.info({ context: "cron", status: data.status }, "Keep-alive ping sent");
        } catch (err) {
          logger.warn({ context: "cron", error: err }, "Keep-alive ping failed");
        }
      }, KEEP_ALIVE_INTERVAL_MS);

      // Don't let the interval prevent graceful shutdown
      keepAliveInterval.unref();
      logger.info({ context: "startup", intervalMs: KEEP_ALIVE_INTERVAL_MS }, "Keep-alive cron started");
    }
  } catch (error) {
    logger.fatal({ context: "startup", error }, `STARTUP FAILED`);
    process.exit(1);
  }
}

// Run the startup
startServer();
