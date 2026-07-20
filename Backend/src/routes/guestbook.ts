import { Router, Request, Response } from "express";
import { guestbookService } from "../services/guestbook.service.js";
import { asyncHandler } from "../lib/async-handler.js";
import { isAuthenticated, isAdmin } from "../auth.js";
import { parseIntParam } from "../lib/params.js";
import { validateBody } from "../middleware/validate.js";
import { guestbookLimiter } from "../lib/rate-limit.js";
import { recordAudit } from "../lib/audit.js";
import { cachePublic } from "../middleware/cache.js";
import { insertGuestbookApiSchema } from "@portfolio/shared";

const guestbookRoutes = Router();

// GET /guestbook - Fetch approved entries
guestbookRoutes.get("/", cachePublic(60), asyncHandler(async (_req: Request, res: Response) => {
    const entries = await guestbookService.getMessages(true);
    res.json(entries);
}));

// POST /guestbook - Submit a new entry
guestbookRoutes.post("/", guestbookLimiter, validateBody(insertGuestbookApiSchema), asyncHandler(async (req, res) => {
    const entry = await guestbookService.addMessage(req.body);
    res.status(201).json({
        success: true,
        message: "Thank you for your message! It will appear once approved.",
        data: entry
    });
}));

// --- Admin Routes ---

// GET /guestbook/admin - Fetch all entries (unfiltered)
guestbookRoutes.get("/admin", isAuthenticated, isAdmin, asyncHandler(async (_req: Request, res: Response) => {
    const entries = await guestbookService.getMessages(false);
    res.json(entries);
}));

// PATCH /guestbook/:id/approve - Approve an entry
guestbookRoutes.patch("/:id/approve", isAuthenticated, isAdmin, asyncHandler(async (req, res) => {
    const id = parseIntParam(res, req.params.id, "guestbook entry ID");
    if (id === null) return;
    const entry = await guestbookService.approveMessage(id);

    // Audit log (A1)
    recordAudit("UPDATE", "guestbook", id, null, { approved: true });

    res.json({
        success: true,
        message: "Entry approved",
        data: entry
    });
}));

// POST /guestbook/:id/react - Add a reaction to an entry
// NOTE: Since this is a public POST route, it is exempt from CSRF protection if the user
// is not logged in. However, if a logged-in admin accesses the public guestbook, the presence
// of the auth_token cookie will trigger the CSRF middleware. The client must ensure that 
// X-CSRF-Token is included if an authenticated session cookie exists.
guestbookRoutes.post("/:id/react", guestbookLimiter, asyncHandler(async (req, res) => {
    const id = parseIntParam(res, req.params.id, "guestbook entry ID");
    if (id === null) return;
    
    const { emoji } = req.body;

    if (!emoji || typeof emoji !== "string" || emoji.length > 8) {
        res.status(400).json({ success: false, message: "Invalid or too long emoji" });
        return;
    }

    // Optional: Validate emoji against a whitelist if needed
    const entry = await guestbookService.addReaction(id, emoji);

    res.json({
        success: true,
        message: "Reaction added",
        data: entry
    });
}));

// DELETE /guestbook/:id - Delete an entry
guestbookRoutes.delete("/:id", isAuthenticated, isAdmin, asyncHandler(async (req, res) => {
    const id = parseIntParam(res, req.params.id, "guestbook entry ID");
    if (id === null) return;
    await guestbookService.deleteMessage(id);

    // Audit log (A1)
    recordAudit("DELETE", "guestbook", id);

    res.status(204).end();
}));

export default guestbookRoutes;
