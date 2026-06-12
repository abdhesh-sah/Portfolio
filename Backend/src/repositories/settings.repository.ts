import { eq } from "drizzle-orm";
import { db } from "../db.js";
import { siteSettingsTable, type SiteSettings, type InsertSiteSettings } from "@portfolio/shared";

// Types moved to @portfolio/shared

export class SettingsRepository {
    async getSettings(): Promise<SiteSettings | null> {
        const [result] = await db
            .select()
            .from(siteSettingsTable)
            .limit(1);
        return (result as SiteSettings) || null;
    }

    async updateSettings(data: InsertSiteSettings): Promise<SiteSettings> {
        const existing = await this.getSettings();

        if (existing) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { id, singletonGuard, updatedAt, ...cleanData } = data as Partial<SiteSettings>;

            const [updated] = await db
                .update(siteSettingsTable)
                .set({ ...cleanData, updatedAt: new Date() })
                .where(eq(siteSettingsTable.id, existing.id))
                .returning();
            return updated as SiteSettings;
        } else {
            const insertData: InsertSiteSettings = {
                ...data,
                isOpenToWork: data.isOpenToWork ?? true,
            };

            const [inserted] = await db
                .insert(siteSettingsTable)
                .values(insertData)
                .returning();
            return inserted as SiteSettings;
        }
    }
}

export const settingsRepository = new SettingsRepository();
