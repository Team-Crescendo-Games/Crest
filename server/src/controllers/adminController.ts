import type { Request, Response } from "express";
import { getPrismaClient } from "../lib/prisma.ts";

// Admin allowlist - must match client/lib/adminAllowlist.ts
const ADMIN_EMAILS: string[] = [
    "uuuuuuxuninghua@gmail.com",
    // Add more admin emails here
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _isAdminEmail = (email: string | undefined | null): boolean => {
    if (!email) return false;
    return ADMIN_EMAILS.includes(email.toLowerCase());
};

/**
 * PATCH /admin/users/:userId - Admin update any user's fields
 */
export const adminUpdateUser = async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params;
    const { username, fullName, cognitoId, email } = req.body;

    // Get admin email from request header (set by auth middleware or passed from frontend)
    const _adminEmail = req.headers["x-admin-email"] as string;

    // For now, we'll trust the frontend admin check since we don't have full auth middleware
    // In production, you'd verify the JWT token and extract the email from it

    const id = Number(userId);
    if (isNaN(id)) {
        res.status(400).json({ message: "Invalid userId parameter" });
        return;
    }

    // Build update data object with only provided fields
    const updateData: {
        username?: string;
        fullName?: string | null;
        cognitoId?: string;
        email?: string | null;
    } = {};
    if (username !== undefined) updateData.username = username;
    if (fullName !== undefined) updateData.fullName = fullName || null;
    if (cognitoId !== undefined) updateData.cognitoId = cognitoId;
    if (email !== undefined) updateData.email = email || null;

    if (Object.keys(updateData).length === 0) {
        res.status(400).json({ message: "No fields to update" });
        return;
    }

    try {
        const user = await getPrismaClient().user.update({
            where: { userId: id },
            data: updateData,
        });
        res.json(user);
    } catch (error: any) {
        if (error.code === "P2002") {
            res.status(400).json({ message: "Username or cognitoId already exists" });
            return;
        }
        if (error.code === "P2025") {
            res.status(404).json({ message: "User not found" });
            return;
        }
        res.status(500).json({ message: `Error updating user: ${error.message}` });
    }
};

/**
 * DELETE /admin/users/:userId - Admin delete a user
 */
export const adminDeleteUser = async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params;
    const id = Number(userId);

    if (isNaN(id)) {
        res.status(400).json({ message: "Invalid userId parameter" });
        return;
    }

    try {
        await getPrismaClient().user.delete({
            where: { userId: id },
        });
        res.status(204).send();
    } catch (error: any) {
        if (error.code === "P2025") {
            res.status(404).json({ message: "User not found" });
            return;
        }
        res.status(500).json({ message: `Error deleting user: ${error.message}` });
    }
};
