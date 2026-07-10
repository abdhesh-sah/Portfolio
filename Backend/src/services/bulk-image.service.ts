import { projectRepository } from "../repositories/project.repository.js";
import { testimonialRepository } from "../repositories/testimonial.repository.js";
import { articleRepository } from "../repositories/article.repository.js";
import { settingsRepository } from "../repositories/settings.repository.js";
import { seoSettingsRepository } from "../repositories/seo-settings.repository.js";
import { UploadService } from "./upload.service.js";
import { validateSafeUrl } from "../lib/url-validator.js";
import { logger } from "../lib/logger.js";

export interface OptimizationStats {
    totalScanned: number;
    migratedToCloudinary: number;
    optimizedUrls: number;
    failed: number;
}

export class BulkImageService {
    private static CLOUDINARY_REGEX = /^https?:\/\/(?:[^/]+\.)?cloudinary\.com\//;
    private static OPTIMIZATION_PARAMS = "q_auto,f_auto";

    /**
     * Scans and optimizes all images in the database.
     */
    static async optimizeAll(): Promise<OptimizationStats> {
        const stats: OptimizationStats = {
            totalScanned: 0,
            migratedToCloudinary: 0,
            optimizedUrls: 0,
            failed: 0
        };

        try {
            await Promise.all([
                this.processProjects(stats),
                this.processTestimonials(stats),
                this.processArticles(stats),
                this.processSiteSettings(stats),
                this.processSeoSettings(stats)
            ]);
        } catch (error) {
            logger.error({ context: "bulk-optimization", error }, "Bulk optimization failed");
            throw error;
        }

        return stats;
    }

    private static isCloudinary(url: string): boolean {
        return this.CLOUDINARY_REGEX.test(url);
    }

    private static hasOptimization(url: string): boolean {
        return url.includes(this.OPTIMIZATION_PARAMS);
    }

    private static injectOptimization(url: string): string {
        if (!this.isCloudinary(url) || this.hasOptimization(url)) return url;
        // Inject q_auto,f_auto after /upload/
        return url.replace("/upload/", `/upload/${this.OPTIMIZATION_PARAMS}/`);
    }

    private static async mapConcurrent<T>(
        items: T[],
        concurrency: number,
        fn: (item: T) => Promise<void>
    ): Promise<void> {
        let index = 0;
        const workers = Array(Math.min(concurrency, items.length)).fill(null).map(async () => {
            while (index < items.length) {
                const i = index++;
                await fn(items[i]);
            }
        });
        await Promise.all(workers);
    }

    private static async fetchWithTimeout(url: string, timeout = 10000) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(id);
            return response;
        } catch (error) {
            clearTimeout(id);
            throw error;
        }
    }

    private static async handleImage(url: string | null | undefined, stats: OptimizationStats): Promise<string | null> {
        if (!url) return null;
        stats.totalScanned++;

        if (!this.isCloudinary(url)) {
            try {
                // SSRF Prevention: Validate URL and pin the resolution
                const { url: safeUrl, resolvedIp } = await validateSafeUrl(url);
                const parsedUrl = new URL(safeUrl);
                const requestUrl = safeUrl.replace(parsedUrl.hostname, resolvedIp);

                // Try to migrate external image to Cloudinary
                const response = await this.fetchWithTimeout(requestUrl);
                if (!response.ok) throw new Error(`Failed to fetch external image: ${response.statusText}`);

                // File Upload Prevention: Verify content is an image (case-insensitive)
                const contentType = response.headers.get("content-type");
                if (!contentType || !contentType.toLowerCase().startsWith("image/")) {
                    throw new Error(`Invalid content type: ${contentType}. Expected an image.`);
                }

                const arrayBuffer = await response.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                const cleanUrl = url.replace(/\/$/, "");
                const fileName = cleanUrl.split('/').pop()?.split('?')[0] || 'external_image';

                const uploadResult = await UploadService.uploadImage(buffer, fileName);
                stats.migratedToCloudinary++;

                return this.injectOptimization(uploadResult.url);
            } catch (error) {
                logger.warn({ context: "bulk-optimization", url, error }, "Failed to migrate external image");
                stats.failed++;
                return url;
            }
        }

        if (!this.hasOptimization(url)) {
            stats.optimizedUrls++;
            return this.injectOptimization(url);
        }

        return url;
    }

    private static async processProjects(stats: OptimizationStats) {
        const projects = await projectRepository.findAllAdmin();
        await this.mapConcurrent(projects, 5, async (project) => {
            try {
                const newUrl = await this.handleImage(project.imageUrl, stats);
                if (newUrl && newUrl !== project.imageUrl) {
                    await projectRepository.update(project.id, { imageUrl: newUrl });
                }
            } catch (error) {
                logger.warn({ context: "bulk-optimization", projectId: project.id, error }, "Failed to update project image");
                stats.failed++;
            }
        });
    }

    private static async processTestimonials(stats: OptimizationStats) {
        const testimonials = await testimonialRepository.findAll();
        await this.mapConcurrent(testimonials, 5, async (t) => {
            try {
                const newUrl = await this.handleImage(t.avatarUrl, stats);
                if (newUrl && newUrl !== t.avatarUrl) {
                    await testimonialRepository.update(t.id, { avatarUrl: newUrl });
                }
            } catch (error) {
                logger.error({ context: "bulk-optimization", testimonialId: t.id, error }, "Failed to process testimonial");
                stats.failed++;
            }
        });
    }

    private static async processArticles(stats: OptimizationStats) {
        const articles = await articleRepository.findAll();
        await this.mapConcurrent(articles, 5, async (article) => {
            try {
                const newUrl = await this.handleImage(article.featuredImage, stats);
                if (newUrl && newUrl !== article.featuredImage) {
                    await articleRepository.update(article.id, { featuredImage: newUrl });
                }
            } catch (error) {
                logger.error({ context: "bulk-optimization", articleId: article.id, error }, "Failed to process article");
                stats.failed++;
            }
        });
    }

    private static async processSiteSettings(stats: OptimizationStats) {
        const settings = await settingsRepository.getSettings();
        if (!settings) return;

        const newAvatar = await this.handleImage(settings.personalAvatar, stats);

        if (newAvatar && newAvatar !== settings.personalAvatar) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { id, updatedAt, ...updateData } = settings;
            await settingsRepository.updateSettings({ ...updateData, personalAvatar: newAvatar });
        }
    }

    private static async processSeoSettings(stats: OptimizationStats) {
        const allSeo = await seoSettingsRepository.getAll();
        await this.mapConcurrent(allSeo, 5, async (seo) => {
            try {
                const newUrl = await this.handleImage(seo.ogImage, stats);
                if (newUrl && newUrl !== seo.ogImage) {
                    await seoSettingsRepository.update(seo.id, { ogImage: newUrl });
                }
            } catch (error) {
                logger.error({ context: "bulk-optimization", seoId: seo.id, error }, "Failed to process SEO setting");
                stats.failed++;
            }
        });
    }
}

