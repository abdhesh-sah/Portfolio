import { Router } from "express";
import { settingsService } from "../services/settings.service.js";
import { insertSiteSettingsApiSchema } from "@portfolio/shared";
import { isAuthenticated } from "../auth.js";
import { asyncHandler } from "../lib/async-handler.js";
import { validateBody } from "../middleware/validate.js";
import { recordAudit } from "../lib/audit.js";
import { syncSeedData } from "../lib/sync-seed.js";
import { cachePublic } from "../middleware/cache.js";

export function registerSettingsRoutes(app: Router) {
    // GET /settings - Publicly get site settings
    app.get(
        "/settings",
        cachePublic(600),
        asyncHandler(async (_req, res) => {
            const settings = await settingsService.getSettings();
            res.json(settings);
        })
    );
    // GET /settings/manifest.json - Dynamic PWA manifest
    app.get(
        "/settings/manifest.json",
        asyncHandler(async (_req, res) => {
            const settings = await settingsService.getSettings();
            
            const name = settings.personalName ? `${settings.personalName} | Portfolio` : "Portfolio";
            const shortName = settings.personalName ? settings.personalName.split(" ")[0] : "Portfolio";
            const description = settings.personalBio || "Senior Full-Stack Engineer specializing in high-performance web systems.";
            const themeColor = "#00B4D8"; // Default brand color
            const bgColor = "#050510";    // Matches index.css --background-hex
            
            res.json({
                name: name,
                short_name: shortName,
                description: description,
                theme_color: themeColor,
                background_color: bgColor,
                display: "standalone",
                start_url: "/",
                icons: [
                    {
                        src: "/icons/pwa-192x192.png",
                        sizes: "192x192",
                        type: "image/png"
                    },
                    {
                        src: "/icons/pwa-512x512.png",
                        sizes: "512x512",
                        type: "image/png"
                    },
                    {
                        src: "/icons/pwa-512x512-maskable.png",
                        sizes: "512x512",
                        type: "image/png",
                        purpose: "maskable"
                    }
                ]
            });
        })
    );

    // PATCH /settings - Update site settings (Admin only)
    app.patch(
        "/settings",
        isAuthenticated,
        validateBody(insertSiteSettingsApiSchema),
        asyncHandler(async (req, res) => {
            const oldSettings = await settingsService.getSettings();
            const newSettings = await settingsService.updateSettings(req.body);

            recordAudit("UPDATE", "site_settings", newSettings.id, oldSettings, req.body);
            syncSeedData("siteSettings", newSettings);

            res.json({
                success: true,
                message: "Site settings updated successfully",
                data: newSettings
            });
        })
    );
}
