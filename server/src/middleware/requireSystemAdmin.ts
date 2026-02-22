import type { Request, Response, NextFunction } from "express";
import { getPrismaClient } from "../lib/prisma.ts";

// System admin allowlist — must match client/lib/adminAllowlist.ts
const ADMIN_EMAILS: string[] = [
    "uuuuuuxuninghua@gmail.com",
    // Add more admin emails here
];

/**
 * Decode a JWT payload without verification (extracts claims only).
 * In production, you should verify the token signature against Cognito JWKS.
 */
function decodeJwtPayload(token: string): Record<string, any> | null {
    try {
        const parts = token.split(".");
        if (parts.length !== 3 || !parts[1]) return null;
        const payload = Buffer.from(parts[1], "base64url").toString("utf-8");
        return JSON.parse(payload);
    } catch {
        return null;
    }
}

/**
 * Middleware that protects admin routes.
 * Extracts the Cognito sub from the Authorization header,
 * looks up the user, and checks their email against the allowlist.
 */
export function requireSystemAdmin() {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith("Bearer ")) {
                res.status(401).json({ error: "Missing or invalid Authorization header" });
                return;
            }

            const token = authHeader.slice(7);
            const payload = decodeJwtPayload(token);
            if (!payload || !payload.sub) {
                res.status(401).json({ error: "Invalid token" });
                return;
            }

            const cognitoId = payload.sub as string;

            // Look up user by cognitoId
            const user = await getPrismaClient().user.findUnique({
                where: { cognitoId },
            });

            if (!user || !user.email) {
                res.status(403).json({ error: "User not found or has no email" });
                return;
            }

            if (!ADMIN_EMAILS.includes(user.email.toLowerCase())) {
                res.status(403).json({ error: "System admin access required" });
                return;
            }

            next();
        } catch (error: any) {
            res.status(500).json({ error: "Admin auth check failed: " + error.message });
        }
    };
}
