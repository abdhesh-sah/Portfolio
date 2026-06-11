import { Router } from "express";
import { z } from "zod";
import { skillService } from "../services/skill.service.js";
import { skillConnectionService } from "../services/skill-connection.service.js";
import { insertSkillApiSchema } from "@portfolio/shared";
import { isAuthenticated } from "../auth.js";
import { asyncHandler } from "../lib/async-handler.js";
import { parseIntParam } from "../lib/params.js";
import { cachePublic } from "../middleware/cache.js";
import { recordAudit } from "../lib/audit.js";
import { validateBody } from "../middleware/validate.js";
import { syncSeedData } from "../lib/sync-seed.js";

export function registerSkillRoutes(app: Router) {
    // GET /api/skills/connections - List all skill connections
    app.get(
        "/skills/connections",
        cachePublic(3600), // Cache connections for 1 hour
        asyncHandler(async (_req, res) => {
            const connections = await skillConnectionService.getAll();
            res.json(connections);
        })
    );

    // GET /skills - Get all skills
    app.get(
        "/skills",
        cachePublic(300), // 5 minutes (reduced from 600 for faster admin updates)
        asyncHandler(async (_req, res) => {
            const skills = await skillService.getAll();
            res.json(skills);
        })
    );

    // GET /skills/:id - Get skill by ID
    app.get(
        "/skills/:id",
        cachePublic(600),
        asyncHandler(async (req, res) => {
            const id = parseIntParam(res, req.params.id, "skill ID");
            if (id === null) return;
            const skill = await skillService.getById(id);
            if (!skill) {
                res.status(404).json({ success: false, message: "Skill not found" });
                return;
            }
            res.json(skill);
        })
    );

    // POST /skills - Create skill
    app.post(
        "/skills",
        isAuthenticated,
        validateBody(insertSkillApiSchema),
        asyncHandler(async (req, res) => {
            const skill = await skillService.create(req.body);
            recordAudit("CREATE", "skill", skill.id, null, req.body);
            syncSeedData("skills", skill);
            res.status(201).json({
                success: true,
                message: "Skill created successfully",
                data: skill
            });
        })
    );

    // PUT /skills/:id - Update skill
    app.put(
        "/skills/:id",
        isAuthenticated,
        validateBody(insertSkillApiSchema.partial()),
        asyncHandler(async (req, res) => {
            const id = parseIntParam(res, req.params.id, "skill ID");
            if (id === null) return;
            const skill = await skillService.update(id, req.body);
            recordAudit("UPDATE", "skill", id, null, req.body);
            syncSeedData("skills", skill);
            res.json({
                success: true,
                message: "Skill updated successfully",
                data: skill
            });
        })
    );

    // DELETE /skills/:id - Delete skill
    app.delete(
        "/skills/:id",
        isAuthenticated,
        asyncHandler(async (req, res) => {
            const id = parseIntParam(res, req.params.id, "skill ID");
            if (id === null) return;
            await skillService.delete(id);
            recordAudit("DELETE", "skill", id, null, null);
            res.status(204).send();
        })
    );

    // POST /skills/bulk-delete - Bulk delete skills
    app.post(
        "/skills/bulk-delete",
        isAuthenticated,
        asyncHandler(async (req, res) => {
            const schema = z.object({ ids: z.array(z.number()) });
            const { ids } = schema.parse(req.body);
            await skillService.bulkDelete(ids);
            recordAudit("DELETE", "skill", undefined, { ids }, null);
            res.status(204).send();
        })
    );
}
