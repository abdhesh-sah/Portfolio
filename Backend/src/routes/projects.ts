import { Router, Request, Response } from "express";
import { z } from "zod";
import { projectService } from "../services/project.service.js";
import { vitalsService } from "../services/vitals.service.js";
import { insertProjectApiSchema } from "@portfolio/shared";
import { isAuthenticated, isAdmin } from "../auth.js";
import { asyncHandler } from "../lib/async-handler.js";
import { parseIntParam } from "../lib/params.js";


import { validateBody } from "../middleware/validate.js";
import { cachePublic } from "../middleware/cache.js";
import { recordAudit } from "../lib/audit.js";
import { syncSeedData } from "../lib/sync-seed.js";
import { logger } from "../lib/logger.js";
import { redis } from "../lib/redis.js";

export function registerProjectRoutes(app: Router) {
  app.get(
    "/projects",
    cachePublic(600),
    asyncHandler(async (req: Request, res: Response) => {
      const sortSchema = z.enum(["views", "default"]).optional().default("default");
      const sortBy = sortSchema.parse(req.query.sort);

      const projects = await projectService.getAll(sortBy);
      res.json(projects);
    })
  );

  // GET /projects/vitals - Project health status
  app.get(
    "/projects/vitals",
    asyncHandler(async (req, res) => {
      const projects = await projectService.getAll();
      const statusMap = await vitalsService.getBulkStatus(
        projects.map(p => ({ id: p.id, healthCheckUrl: p.healthCheckUrl ?? null }))
      );
      res.json(statusMap);
    })
  );

  // POST /projects - Create project
  app.post(
    "/projects",
    isAuthenticated,
    isAdmin,
    validateBody(insertProjectApiSchema),
    asyncHandler(async (req, res) => {
      const project = await projectService.create(req.body);
      recordAudit("CREATE", "project", project.id, null, req.body);
      res.status(201).json({
        success: true,
        message: "Project created successfully",
        data: project
      });
    })
  );

  // PUT /projects/reorder - Reorder projects
  app.put(
    "/projects/reorder",
    isAuthenticated,
    isAdmin,
    asyncHandler(async (req, res) => {
      const schema = z.object({ orderedIds: z.array(z.number()) });
      const { orderedIds } = schema.parse(req.body);
      await projectService.updateReorder(orderedIds);
      recordAudit("UPDATE", "project", undefined, null, { orderedIds });
      res.status(204).send();
    })
  );

  // POST /projects/:id/summary - AI Summary Generation
  app.post(
    "/projects/:id/summary",
    isAuthenticated,
    isAdmin,
    asyncHandler(async (req, res) => {
      const id = parseIntParam(res, req.params.id, "project ID");
            if (id === null) return;
      const summary = await projectService.generateSummary(id);
      recordAudit("UPDATE", "project", id, null, { summary });
      res.json({ success: true, summary });
    })
  );

  // POST /projects/bulk-delete
  app.post(
    "/projects/bulk-delete",
    isAuthenticated,
    isAdmin,
    asyncHandler(async (req, res) => {
      const schema = z.object({ ids: z.array(z.number()) });
      const { ids } = schema.parse(req.body);
      await projectService.bulkDelete(ids);
      recordAudit("DELETE", "project", undefined, { ids }, null);
      res.status(204).send();
    })
  );

  // POST /projects/bulk-status
  app.post(
    "/projects/bulk-status",
    isAuthenticated,
    isAdmin,
    asyncHandler(async (req, res) => {
      const schema = z.object({
        ids: z.array(z.number()),
        status: z.enum(["In Progress", "Completed", "Archived"]),
      });
      const { ids, status } = schema.parse(req.body);
      await projectService.bulkUpdateStatus(ids, status);
      recordAudit("UPDATE", "project", undefined, null, { ids, status });
      res.status(204).send();
    })
  );

  // GET /api/projects/:id - Get project by ID (Moved to bottom)
  app.get(
    "/projects/:id",
    cachePublic(300), // 5 minutes (reduced from 600 for faster admin updates)
    asyncHandler(async (req, res) => {
      const id = parseIntParam(res, req.params.id, "project ID");
      if (id === null) return;
      
      const project = await projectService.getById(id);
      
      if (!project || project.isHidden) {
        res.status(404).json({ success: false, message: "Project not found" });
        return;
      }
      res.json(project);

      // Fire-and-forget IP-based deduplication for view counts (1 hour)
      const ip = req.ip || 'unknown';
      const viewKey = `view:project:${project.id}:ip:${ip}`;

      const r = redis;
      if (r) {
        r.get(viewKey).then((hasViewed: string | null) => {
          if (!hasViewed) {
            projectService.incrementViewCount(project.id).catch((err: unknown) => {
              logger.error({ context: "project", id: project.id, error: err }, "Failed to increment view count");
            });
            r.set(viewKey, "1", "EX", 3600).catch((err: unknown) => {
              logger.error({ context: "project", error: err }, "Failed to set view cache");
            });
          }
        }).catch((err: unknown) => {
          logger.error({ context: "project", error: err }, "Failed to check view cache");
        });
      } else {
        // Fallback if no redis
        projectService.incrementViewCount(project.id).catch((err: unknown) => {
          logger.error({ context: "project", id: project.id, error: err }, "Failed to increment view count");
        });
      }
    })
  );

  // PUT /projects/:id - Update project
  app.put(
    "/projects/:id",
    isAuthenticated,
    isAdmin,
    validateBody(insertProjectApiSchema.partial()),
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseIntParam(res, req.params.id, "project ID");
            if (id === null) return;
      const project = await projectService.update(id, req.body);
      recordAudit("UPDATE", "project", id, null, req.body);
      syncSeedData("projects", project);
      res.json({
        success: true,
        message: "Project updated successfully",
        data: project
      });
    })
  );

  // DELETE /projects/:id - Delete project
  app.delete(
    "/projects/:id",
    isAuthenticated,
    isAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseIntParam(res, req.params.id, "project ID");
            if (id === null) return;
      await projectService.delete(id);
      recordAudit("DELETE", "project", id, null, null);
      res.status(204).send();
    })
  );
}
