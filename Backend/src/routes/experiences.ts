import { Router } from "express";
import { insertExperienceApiSchema } from "@portfolio/shared";
import { isAuthenticated } from "../auth.js";
import { asyncHandler } from "../lib/async-handler.js";
import { parseIntParam } from "../lib/params.js";
import { cachePublic } from "../middleware/cache.js";
import { experienceService } from "../services/experience.service.js";
import { recordAudit } from "../lib/audit.js";
import { syncSeedData } from "../lib/sync-seed.js";

export function registerExperienceRoutes(app: Router) {
    // GET /experiences - Get all experiences
    app.get(
        "/experiences",
        cachePublic(300), // 5 minutes (reduced from 600 for faster admin updates)
        asyncHandler(async (_req, res) => {
            const experiences = await experienceService.getAll();
            res.json(experiences);
        })
    );

    // GET /experiences/:id - Get experience by ID
    app.get(
        "/experiences/:id",
        cachePublic(300), // 5 minutes (reduced from 600 for faster admin updates)
        asyncHandler(async (req, res) => {
            const id = parseIntParam(res, req.params.id, "experience ID");
            if (id === null) return;
            const experience = await experienceService.getById(id);
            if (!experience) {
                res.status(404).json({ success: false, message: "Experience not found" });
                return;
            }
            res.json(experience);
        })
    );

    // POST /experiences - Create experience
    app.post(
        "/experiences",
        isAuthenticated,
        asyncHandler(async (req, res) => {
            const data = insertExperienceApiSchema.parse(req.body);
            const experience = await experienceService.create(data);
            recordAudit("CREATE", "experience", experience.id, null, data as Record<string, unknown>);
            syncSeedData("experiences", experience);
            res.status(201).json({
                success: true,
                message: "Experience created successfully",
                data: experience
            });
        })
    );

    // PUT /experiences/:id - Update experience
    app.put(
        "/experiences/:id",
        isAuthenticated,
        asyncHandler(async (req, res) => {
            const id = parseIntParam(res, req.params.id, "experience ID");
            if (id === null) return;
            const data = insertExperienceApiSchema.partial().parse(req.body);
            const experience = await experienceService.update(id, data);
            recordAudit("UPDATE", "experience", id, null, data as Record<string, unknown>);
            syncSeedData("experiences", experience);
            res.json({
                success: true,
                message: "Experience updated successfully",
                data: experience
            });
        })
    );

    // DELETE /experiences/:id - Delete experience
    app.delete(
        "/experiences/:id",
        isAuthenticated,
        asyncHandler(async (req, res) => {
            const id = parseIntParam(res, req.params.id, "experience ID");
            if (id === null) return;
            await experienceService.delete(id);
            recordAudit("DELETE", "experience", id, null, null);
            res.status(204).send();
        })
    );

    // POST /experiences/bulk-delete - Bulk delete experiences
    app.post(
        "/experiences/bulk-delete",
        isAuthenticated,
        asyncHandler(async (req, res) => {
            const { ids } = req.body;
            if (!Array.isArray(ids)) {
                res.status(400).json({ success: false, message: "IDs must be an array" });
                return;
            }
            await experienceService.bulkDelete(ids);
            // Record audit for each if needed, or just one for the bulk action
            recordAudit("DELETE", "experience", 0, null, { bulk: true, ids });
            res.status(204).send();
        })
    );
}
