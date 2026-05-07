import type { Express } from "express";
import { Router } from "express";
import { registerProjectRoutes } from "./routes/projects.js";
import { registerSkillRoutes } from "./routes/skills.js";
import { registerExperienceRoutes } from "./routes/experiences.js";
import { registerMessageRoutes } from "./routes/messages.js";
import { registerMindsetRoutes } from "./routes/mindset.js";
import { authRoutes } from "./routes/auth.js";
import { registerUploadRoutes } from "./routes/upload.js";
import { registerAnalyticsRoutes } from "./routes/analytics.js";
import { registerEmailTemplateRoutes } from "./routes/email-templates.js";
import { registerServiceRoutes } from "./routes/services.js";
import seoRoutes from "./routes/seo.js";
import { sitemapRoutes } from "./routes/sitemap.js";
import { articlesRouter } from "./routes/articles.js";
import { debugRouter } from "./routes/debug.js";
import { registerTestimonialRoutes } from "./routes/testimonials.js";
import { registerChatRoutes } from "./routes/chat.js";
import { registerSettingsRoutes } from "./routes/settings.js";
import { registerAdminRoutes } from "./routes/admin.js";
import feedRoutes from "./routes/feed.js";
import githubRoutes from "./routes/github.js";
import guestbookRoutes from "./routes/guestbook.js";
import auditLogRoutes from "./routes/audit-log.js";
import scopeRoutes from "./routes/scope.js";
import { registerReviewRoutes } from "./routes/review.js";
import { registerCaseStudyRoutes } from "./routes/case-studies.js";
import { registerClientRoutes } from "./routes/clients.js";
import { registerSketchpadRoutes } from "./routes/sketchpad.js";
import { registerCoverLetterRoutes } from "./routes/cover-letter.js";

import subscribersRouter from "./routes/subscribers.js";
import { testRouter } from "./routes/test.js";
import ogRouter from "./routes/og.js";

import searchRouter from "./routes/search.js";
import readingListRouter from "./routes/reading-list.js";
import express from "express";
import { csrfProtection } from "./middleware/csrf.js";
import { logger } from "./lib/logger.js";

export function registerRoutes(app: Express) {
  const v1Router = Router();

  // CSRF protection for all state-changing admin requests
  // Exclude /test (E2E setup) and public search routes
  v1Router.use((req, res, next) => {
    if (req.path.startsWith("/test") || req.path.startsWith("/search")) {
      return next();
    }
    return csrfProtection(req, res, next);
  });

  // Register all routes on the v1 router
  v1Router.use("/auth", authRoutes);
  v1Router.use("/seo", seoRoutes);
  v1Router.use("/sitemap", sitemapRoutes);
  v1Router.use("/articles", articlesRouter);
  v1Router.use("/feed", feedRoutes);
  v1Router.use("/github", githubRoutes);
  v1Router.use("/guestbook", guestbookRoutes);
  v1Router.use("/scope", scopeRoutes);
  v1Router.use("/", subscribersRouter);
  v1Router.use("/og", ogRouter);
  v1Router.use("/search", searchRouter);
  v1Router.use("/reading-list", readingListRouter);

  if (process.env.NODE_ENV === "test") {
    v1Router.use("/test", testRouter);
  }

  if (process.env.NODE_ENV !== "production") {
    v1Router.use("/debug", debugRouter);
  }


  // CSP violation reporting route
  v1Router.post(
    "/csp-report",
    express.json({ type: "application/csp-report" }),
    (req: express.Request, res: express.Response) => {
      logger.warn({ report: req.body }, "CSP Violation");
      res.status(204).end();
    }
  );

  // Register routes that use the functional registration pattern
  registerProjectRoutes(v1Router);
  registerSkillRoutes(v1Router);
  registerExperienceRoutes(v1Router);
  registerMessageRoutes(v1Router);
  registerMindsetRoutes(v1Router);
  registerServiceRoutes(v1Router);
  registerUploadRoutes(v1Router);
  registerAnalyticsRoutes(v1Router);
  registerEmailTemplateRoutes(v1Router);
  registerTestimonialRoutes(v1Router);
  registerChatRoutes(v1Router);
  registerSettingsRoutes(v1Router);
  registerAdminRoutes(v1Router);

  // MF-2: AI Project Analysis
  registerReviewRoutes(v1Router);
  // MF-3: Auto Case Studies
  registerCaseStudyRoutes(v1Router);
  // MF-4: Client Portal
  registerClientRoutes(v1Router);
  // MF-5: Sketchpad
  registerSketchpadRoutes(v1Router);
  // MF-6: AI Cover Letter
  registerCoverLetterRoutes(v1Router);


  // Admin audit log
  v1Router.use("/admin", auditLogRoutes);

  // Main API versioning
  app.use("/api/v1", v1Router);
}
