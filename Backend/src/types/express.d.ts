// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Request } from "express";

declare global {
    namespace Express {
        interface Request {
            id: string;
            timedout?: boolean;
            rawBody?: Buffer;
            user?: {
                role: string;
                email?: string;
                token?: string;
                via?: "bearer" | "cookie";
            };
        }
    }
}
