import type { Request, Response } from "express";
import { getPrismaClient } from "../lib/prisma.ts";
import { ALL_PERMISSIONS, ADMIN_PERMISSIONS, PERMISSIONS } from "../lib/permissions.ts";

/**
 * Admin: Get all workspaces with creator info
 */
export const adminGetAllWorkspaces = async (_req: Request, res: Response) => {
    try {
        const workspaces = await getPrismaClient().workspace.findMany({
            include: {
                createdBy: true,
                _count: { select: { members: true } },
            },
            orderBy: { id: "desc" },
        });
        res.json(workspaces);
    } catch (error: any) {
        console.error("Error fetching all workspaces:", error.message);
        res.status(500).json({ error: "Failed to fetch workspaces: " + error.message });
    }
};

/**
 * Admin: Update any workspace (no membership check)
 */
export const adminUpdateWorkspace = async (req: Request, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const { name, description, joinPolicy, createdById } = req.body;

        if (name !== undefined && name.length > 64) {
            res.status(400).json({ error: "Workspace name must be 64 characters or fewer" });
            return;
        }

        if (createdById !== undefined && createdById !== null) {
            const user = await getPrismaClient().user.findUnique({
                where: { userId: Number(createdById) },
            });
            if (!user) {
                res.status(400).json({ error: `User with ID ${createdById} not found` });
                return;
            }
        }

        const workspace = await getPrismaClient().workspace.update({
            where: { id: Number(workspaceId) },
            data: {
                ...(name !== undefined && { name }),
                ...(description !== undefined && { description }),
                ...(joinPolicy !== undefined && { joinPolicy: Number(joinPolicy) }),
                ...(createdById !== undefined && {
                    createdById: createdById ? Number(createdById) : null,
                }),
            },
        });

        res.json(workspace);
    } catch (error: any) {
        console.error("Error admin-updating workspace:", error.message);
        res.status(500).json({ error: "Failed to update workspace: " + error.message });
    }
};

/**
 * Admin: Delete any workspace (no membership check)
 */
export const adminDeleteWorkspace = async (req: Request, res: Response) => {
    try {
        const { workspaceId } = req.params;

        await getPrismaClient().workspace.delete({
            where: { id: Number(workspaceId) },
        });

        res.status(204).send();
    } catch (error: any) {
        console.error("Error admin-deleting workspace:", error.message);
        res.status(500).json({ error: "Failed to delete workspace: " + error.message });
    }
};

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
 * Create a new workspace AND automatically add the creator as Owner.
 * Creates default roles: Owner (all permissions), Admin (all except delete), Member (invite only).
 */
export const createWorkspace = async (req: Request, res: Response) => {
    try {
        const { name, userId } = req.body;

        if (!name || !userId) {
            res.status(400).json({ error: "name and userId are required" });
            return;
        }

        if (name.length > 64) {
            res.status(400).json({ error: "Workspace name must be 64 characters or fewer" });
            return;
        }

        const prisma = getPrismaClient();
        const numericUserId = Number(userId);

        const workspace = await prisma.$transaction(async (tx) => {
            // 1. Create the workspace
            const ws = await tx.workspace.create({
                data: {
                    name,
                    createdById: numericUserId,
                },
            });

            // 2. Create default roles
            const ownerRole = await tx.role.create({
                data: {
                    name: "Owner",
                    color: "#F59E0B",
                    permissions: ALL_PERMISSIONS,
                    workspaceId: ws.id,
                },
            });

            await tx.role.create({
                data: {
                    name: "Admin",
                    color: "#EF4444",
                    permissions: ADMIN_PERMISSIONS,
                    workspaceId: ws.id,
                },
            });

            await tx.role.create({
                data: {
                    name: "Member",
                    color: "#6B7280",
                    permissions: PERMISSIONS.INVITE,
                    workspaceId: ws.id,
                },
            });

            // 3. Add the creator as a member with the Owner role
            await tx.workspaceMember.create({
                data: {
                    userId: numericUserId,
                    workspaceId: ws.id,
                    roleId: ownerRole.id,
                },
            });

            return ws;
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
        const { name, description, joinPolicy } = req.body;

        if (name !== undefined && name.length > 64) {
            res.status(400).json({ error: "Workspace name must be 64 characters or fewer" });
            return;
        }

        const workspace = await getPrismaClient().workspace.update({
            where: { id: Number(workspaceId) },
            data: {
                ...(name !== undefined && { name }),
                ...(description !== undefined && { description }),
                ...(joinPolicy !== undefined && { joinPolicy: Number(joinPolicy) }),
            },
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
                role: true, // Include the role data (name, color, permissions)
            },
        });

        res.json(members);
    } catch (error: any) {
        console.error("Error fetching workspace members:", error.message);
        res.status(500).json({ error: "Failed to fetch workspace members: " + error.message });
    }
};

/**
 * Add a new member to an existing workspace, assigning the default "Member" role
 */
export const addWorkspaceMember = async (req: Request, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const { email } = req.body;

        if (!email) {
            res.status(400).json({ error: "email is required" });
            return;
        }

        const prisma = getPrismaClient();
        const wsId = Number(workspaceId);

        // Look up user by email
        const user = await prisma.user.findFirst({
            where: { email: String(email) },
        });

        if (!user) {
            res.status(404).json({ error: "User does not exist" });
            return;
        }

        // Check if already a member
        const existing = await prisma.workspaceMember.findUnique({
            where: { userId_workspaceId: { userId: user.userId, workspaceId: wsId } },
        });

        if (existing) {
            res.status(400).json({ error: "User is already a member of this workspace" });
            return;
        }

        // Look up the default "Member" role for this workspace
        const memberRole = await prisma.role.findFirst({
            where: { workspaceId: wsId, name: "Member" },
        });

        if (!memberRole) {
            res.status(500).json({ error: "Default Member role not found for this workspace" });
            return;
        }

        const member = await prisma.workspaceMember.create({
            data: {
                workspaceId: wsId,
                userId: user.userId,
                roleId: memberRole.id,
            },
            include: { role: true, user: true },
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
        const prisma = getPrismaClient();
        const wsId = Number(workspaceId);
        const targetUserId = Number(userId);

        // Prevent removing the workspace owner (by creator flag OR Owner role)
        const workspace = await prisma.workspace.findUnique({ where: { id: wsId } });
        if (workspace?.createdById === targetUserId) {
            res.status(403).json({ error: "Cannot remove the workspace owner" });
            return;
        }

        const membership = await prisma.workspaceMember.findUnique({
            where: { userId_workspaceId: { userId: targetUserId, workspaceId: wsId } },
            include: { role: true },
        });
        if (membership?.role?.name === "Owner") {
            res.status(403).json({ error: "Cannot remove the workspace owner" });
            return;
        }

        await prisma.workspaceMember.delete({
            where: {
                userId_workspaceId: {
                    userId: targetUserId,
                    workspaceId: wsId,
                },
            },
        });

        res.status(204).send();
    } catch (error: any) {
        console.error("Error removing workspace member:", error.message);
        res.status(500).json({ error: "Failed to remove workspace member: " + error.message });
    }
};

/**
 * Update a workspace member's role
 * PATCH /workspaces/:workspaceId/members/:userId/role
 */
export const updateMemberRole = async (req: Request, res: Response) => {
    try {
        const { workspaceId, userId } = req.params;
        const { roleId } = req.body;

        if (!roleId) {
            res.status(400).json({ error: "roleId is required" });
            return;
        }

        const prisma = getPrismaClient();
        const wsId = Number(workspaceId);
        const targetUserId = Number(userId);

        // Check if the workspace exists and get the creator
        const workspace = await prisma.workspace.findUnique({
            where: { id: wsId },
        });

        if (!workspace) {
            res.status(404).json({ error: "Workspace not found" });
            return;
        }

        // Prevent changing the workspace creator's role
        if (workspace.createdById === targetUserId) {
            res.status(400).json({ error: "Cannot change the workspace creator's role" });
            return;
        }

        // Prevent admins from demoting themselves
        const requestingUserId = Number(req.body.userId);
        if (requestingUserId === targetUserId) {
            res.status(400).json({ error: "Cannot change your own role" });
            return;
        }

        // Validate the target role exists in this workspace
        const targetRole = await prisma.role.findFirst({
            where: { id: Number(roleId), workspaceId: wsId },
        });

        if (!targetRole) {
            res.status(400).json({ error: "Role not found in this workspace" });
            return;
        }

        // Update the member's role
        const updatedMember = await prisma.workspaceMember.update({
            where: {
                userId_workspaceId: {
                    userId: targetUserId,
                    workspaceId: wsId,
                },
            },
            include: { role: true, user: true },
            data: { roleId: Number(roleId) },
        });

        res.json(updatedMember);
    } catch (error: any) {
        console.error("Error updating member role:", error.message);
        res.status(500).json({ error: "Failed to update member role: " + error.message });
    }
};

/**
 * Update a workspace's icon extension
 * PATCH /workspaces/:workspaceId/icon
 */
export const updateWorkspaceIcon = async (req: Request, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const { iconExt } = req.body;

        const workspace = await getPrismaClient().workspace.update({
            where: { id: Number(workspaceId) },
            data: { iconExt: iconExt || null },
        });

        res.json(workspace);
    } catch (error: any) {
        console.error("Error updating workspace icon:", error.message);
        res.status(500).json({ error: "Failed to update workspace icon: " + error.message });
    }
};

export const updateWorkspaceHeader = async (req: Request, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const { headerExt } = req.body;

        const workspace = await getPrismaClient().workspace.update({
            where: { id: Number(workspaceId) },
            data: { headerExt: headerExt || null },
        });

        res.json(workspace);
    } catch (error: any) {
        console.error("Error updating workspace header:", error.message);
        res.status(500).json({ error: "Failed to update workspace header: " + error.message });
    }
};
