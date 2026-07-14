import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../env.js";
import { logger } from "./logger.js";

const genAI = env.GEMINI_API_KEY ? new GoogleGenerativeAI(env.GEMINI_API_KEY) : null;

export const aiClient = {
    async generateContent(prompt: string, modelName = "gemini-1.5-flash") {
        if (!genAI) {
            throw new Error("GEMINI_API_KEY not configured");
        }

        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            logger.error({ error, prompt, modelName }, "AI Generation failed");
            throw error;
        }
    },

    async generateJSON<T>(prompt: string, modelName = "gemini-1.5-flash"): Promise<T> {
        const text = await this.generateContent(`${prompt}\n\nIMPORTANT: Return ONLY valid JSON. No markdown backticks.`, modelName);
        try {
            // Remove potential markdown backticks if Gemini ignores the instruction
            const cleanJson = text.replace(/```json|```/g, "").trim();
            return JSON.parse(cleanJson) as T;
        } catch (error) {
            logger.error({ error, text }, "Failed to parse AI JSON response");
            throw new Error("Invalid AI response format", { cause: error });
        }
    }
};
