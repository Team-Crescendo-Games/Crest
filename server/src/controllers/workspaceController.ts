import type { Request, Response } from "express";
import { getPrismaClient } from "../lib/prisma.ts";

/**
 * Get all workspaces a user belongs to
 */
export const getUserWorkspaces = async (req: Request, res: Response) => {
    try {
        const { userId } = req.query;

        if (!userId) {
            res.status(400).json({ error: "userId is required" });
            return;
        }

        const memberships = await getPrismaClient().workspaceMember.findMany({
            where: { userId: Number(userId) },
            include: {
                workspace: true,
            },
        });

        const workspaces = memberships.map((m: any) => m.workspace);
        res.json(workspaces);
    } catch (error: any) {
        console.error("Error fetching workspaces:", error.message);
        res.status(500).json({ error: "Failed to fetch workspaces: " + error.message });
    }
};

/**
 * Create a new workspace AND automatically add the creator as an ADMIN
 */
export const createWorkspace = async (req: Request, res: Response) => {
    try {
        const { name, userId } = req.body;

        if (!name || !userId) {
            res.status(400).json({ error: "name and userId are required" });
            return;
        }

        const workspace = await getPrismaClient().workspace.create({
            data: {
                name,
                members: {
                    create: {
                        userId: Number(userId),
                        role: "ADMIN",
                    },
                },
            },
        });

        res.status(201).json(workspace);
    } catch (error: any) {
        console.error("Error creating workspace:", error.message);
        res.status(500).json({ error: "Failed to create workspace: " + error.message });
    }
};

/**
 * Update a workspace's details
 */
export const updateWorkspace = async (req: Request, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const { name } = req.body;

        const workspace = await getPrismaClient().workspace.update({
            where: { id: Number(workspaceId) },
            data: { name },
        });

        res.json(workspace);
    } catch (error: any) {
        console.error("Error updating workspace:", error.message);
        res.status(500).json({ error: "Failed to update workspace: " + error.message });
    }
};

/**
 * Delete a workspace entirely
 */
export const deleteWorkspace = async (req: Request, res: Response) => {
    try {
        const { workspaceId } = req.params;

        await getPrismaClient().workspace.delete({
            where: { id: Number(workspaceId) },
        });

        res.status(204).send();
    } catch (error: any) {
        console.error("Error deleting workspace:", error.message);
        res.status(500).json({ error: "Failed to delete workspace: " + error.message });
    }
};

/**
 * Get all members within a specific workspace
 */
export const getWorkspaceMembers = async (req: Request, res: Response) => {
    try {
        const { workspaceId } = req.params;

        const members = await getPrismaClient().workspaceMember.findMany({
            where: { workspaceId: Number(workspaceId) },
            include: {
                user: true, // Bring in the user's name, email, etc.
            },
        });

        res.json(members);
    } catch (error: any) {
        console.error("Error fetching workspace members:", error.message);
        res.status(500).json({ error: "Failed to fetch workspace members: " + error.message });
    }
};

/**
 * Add a new member to an existing workspace
 */
export const addWorkspaceMember = async (req: Request, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const { userId, role } = req.body;

        const member = await getPrismaClient().workspaceMember.create({
            data: {
                workspaceId: Number(workspaceId),
                userId: Number(userId),
                role: role || "MEMBER",
            },
        });

        res.status(201).json(member);
    } catch (error: any) {
        console.error("Error adding workspace member:", error.message);
        res.status(500).json({ error: "Failed to add workspace member: " + error.message });
    }
};

/**
 * Remove a member from a workspace
 */
export const removeWorkspaceMember = async (req: Request, res: Response) => {
    try {
        const { workspaceId, userId } = req.params;

        // Because we set up a composite unique key (@@unique([userId, workspaceId])),
        // we can query by it directly to delete the exact join record.
        await getPrismaClient().workspaceMember.delete({
            where: {
                userId_workspaceId: {
                    userId: Number(userId),
                    workspaceId: Number(workspaceId),
                },
            },
        });

        res.status(204).send();
    } catch (error: any) {
        console.error("Error removing workspace member:", error.message);
        res.status(500).json({ error: "Failed to remove workspace member: " + error.message });
    }
};
