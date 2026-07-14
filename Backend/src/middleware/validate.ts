import { Request, Response, NextFunction } from "express";
import { AnyZodObject, ZodError } from "zod";

/**
 * Middleware to validate request body against a Zod schema.
 */
export const validateBody = (schema: AnyZodObject) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            req.body = await schema.parseAsync(req.body);
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                res.status(400).json({
                    message: "Validation failed",
                    errors: error.errors.map((e) => ({
                        path: e.path.join("."),
                        message: e.message,
                    })),
                });
                return;
            }
            next(error);
        }
    };
};
