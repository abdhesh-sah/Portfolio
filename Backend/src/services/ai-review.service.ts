import { db } from "../db.js";
import { and, eq } from "drizzle-orm";
import { codeReviewsTable, type CodeReview } from "@portfolio/shared";
import { codeReviewRepository } from "../repositories/code-review.repository.js";
import { projectService } from "./project.service.js";
import { logger } from "../lib/logger.js";
import { env } from "../env.js";

/** Strip HTML/XML tags and control chars to prevent prompt injection */
function sanitizeForPrompt(text: string): string {
    let previous: string;
    let current = text;
    do {
        previous = current;
        current = current.replace(/<[^>]*>/g, "");          // Remove HTML/XML tags
    } while (current !== previous);

    return current
        // eslint-disable-next-line no-control-regex
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "") // Remove control chars
        .trim();
}

export class AIReviewService {
    async getLatestReview(projectId: number): Promise<CodeReview | null> {
        return codeReviewRepository.findByProjectId(projectId);
    }

    async triggerReview(projectId: number): Promise<CodeReview> {
        const project = await projectService.getById(projectId);
        if (!project) throw new Error("Project not found");

        try {
            const review = await codeReviewRepository.create({
                projectId,
                content: "",
                badges: [],
                status: "processing",
            });

            // Run review in background (fire-and-forget)
            this.runReview(review.id, project).catch((err) => {
                logger.error({ err, projectId }, "AI review failed");
            });

            return review;
        } catch (error: unknown) {
            if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
                logger.info(`[AIReviewService] Review already processing for project ${projectId}`);
                const existingReview = await db.query.codeReviewsTable.findFirst({
                    where: and(
                        eq(codeReviewsTable.projectId, projectId),
                        eq(codeReviewsTable.status, "processing")
                    ),
                });
                if (existingReview) return existingReview as CodeReview;
            }
            throw error;
        }
    }

    private async runReview(reviewId: number, project: { title: string; description: string; techStack: string[]; githubUrl: string | null }): Promise<void> {
        try {
            const apiKey = env.GEMINI_API_KEY;
            if (!apiKey) {
                await codeReviewRepository.updateStatus(reviewId, "failed", undefined, undefined, "Gemini API key not configured");
                return;
            }

            let githubContext = "";
            if (project.githubUrl) {
                try {
                    const context = await this.fetchGithubContext(project.githubUrl);
                    githubContext = `
## Repository Context
### README
${context.readme || "README not found"}

### File Structure
${context.fileTree || "File tree not available"}
`;
                } catch (err) {
                    logger.warn({ err, githubUrl: project.githubUrl }, "Failed to fetch GitHub context for AI review");
                    // Continue without GitHub context if it fails
                }
            }

            const prompt = this.buildPrompt(project, githubContext);
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
                }),
            });

            if (!response.ok) {
                throw new Error(`Gemini API error: ${response.status}`);
            }

            interface GeminiResponse {
                candidates?: Array<{
                    content?: {
                        parts?: Array<{
                            text?: string;
                        }>;
                    };
                }>;
            }

            const data = await response.json() as GeminiResponse;
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No review generated.";

            // Extract badges from content
            const badges: string[] = [];
            if (text.toLowerCase().includes("security")) badges.push("security");
            if (text.toLowerCase().includes("performance")) badges.push("performance");
            if (text.toLowerCase().includes("architecture")) badges.push("architecture");
            if (text.toLowerCase().includes("testing")) badges.push("testing");
            if (text.toLowerCase().includes("accessibility")) badges.push("accessibility");

            await codeReviewRepository.updateStatus(reviewId, "completed", text, badges);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Unknown error";
            logger.error({ err, reviewId }, "AI review generation failed");
            await codeReviewRepository.updateStatus(reviewId, "failed", undefined, undefined, message);
        }
    }

    private async fetchGithubContext(githubUrl: string): Promise<{ readme?: string; fileTree?: string }> {
        const match = githubUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
        if (!match) return {};

        const owner = match[1];
        const repo = match[2].replace(/\.git$/, "");
        const results: { readme?: string; fileTree?: string } = {};

        try {
            // Fetch README (using the custom header for raw content)
            const readmeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
                headers: { "Accept": "application/vnd.github.v3.raw" }
            });
            if (readmeRes.ok) {
                results.readme = (await readmeRes.text()).slice(0, 5000); // Limit size
            }

            // Fetch file tree (limit to top level and important subdirs)
            const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents`);
            if (treeRes.ok) {
                const contents = await treeRes.json() as Array<{ type: string; path: string }>;
                results.fileTree = contents
                    .map(item => `${item.type === 'dir' ? '📁' : '📄'} ${item.path}`)
                    .join("\n");
            }
        } catch (err) {
            logger.error({ err, owner, repo }, "Error fetching GitHub context");
        }

        return results;
    }

    private buildPrompt(project: { title: string; description: string; techStack: string[]; githubUrl: string | null }, githubContext: string): string {
        const safeTitle = sanitizeForPrompt(project.title);
        const safeDesc = sanitizeForPrompt(project.description);
        const safeTech = project.techStack.map(t => sanitizeForPrompt(t)).join(", ");
        return `You are a senior software engineer conducting a code review. Analyze the following project and provide a comprehensive review with actionable feedback.
${githubContext}

## Project: ${safeTitle}

**Description:** ${safeDesc}

**Tech Stack:** ${safeTech}

${project.githubUrl ? `**GitHub:** ${sanitizeForPrompt(project.githubUrl)}` : ""}

Please provide your review in the following markdown format:

## 🔒 Security
Assess potential security concerns.

## ⚡ Performance
Evaluate performance considerations.

## 🏗️ Architecture
Review architectural decisions and patterns.

## 🧪 Testing
Evaluate testing strategy considerations.

## 💡 Recommendations
List the top 5 actionable improvements.

## 📊 Overall Score
Rate the project on a scale of 1-10 with justification.`;
    }
}

export const aiReviewService = new AIReviewService();
