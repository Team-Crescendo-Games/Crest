import type { Request, Response } from "express";
import { getPrismaClient } from "../lib/prisma.ts";

/**
 * Create a workspace invitation (requires INVITE permission)
 * POST /workspaces/:workspaceId/invitations
 */
export const createInvitation = async (req: Request, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const { userId, expiresInDays } = req.body;

        if (!userId) {
            res.status(400).json({ error: "userId is required" });
            return;
        }

        const days = Number(expiresInDays) || 7;
        if (days < 1 || days > 90) {
            res.status(400).json({ error: "expiresInDays must be between 1 and 90" });
            return;
        }

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + days);

        const invitation = await getPrismaClient().workspaceInvitation.create({
            data: {
                workspaceId: Number(workspaceId),
                createdById: Number(userId),
                expiresAt,
            },
            include: { workspace: { select: { name: true } } },
        });

        res.status(201).json(invitation);
    } catch (error: any) {
        console.error("Error creating invitation:", error.message);
        res.status(500).json({ error: "Failed to create invitation: " + error.message });
    }
};

/**
 * List invitations for a workspace (requires INVITE permission)
 * GET /workspaces/:workspaceId/invitations
 */
export const getInvitations = async (req: Request, res: Response) => {
    try {
        const { workspaceId } = req.params;

        const invitations = await getPrismaClient().workspaceInvitation.findMany({
            where: { workspaceId: Number(workspaceId) },
            include: { createdBy: { select: { username: true } } },
            orderBy: { createdAt: "desc" },
        });

        res.json(invitations);
    } catch (error: any) {
        console.error("Error fetching invitations:", error.message);
        res.status(500).json({ error: "Failed to fetch invitations: " + error.message });
    }
};

/**
 * Delete an invitation (requires INVITE permission)
 * DELETE /workspaces/:workspaceId/invitations/:invitationId
 */
export const deleteInvitation = async (req: Request, res: Response) => {
    try {
        const { invitationId } = req.params;

        await getPrismaClient().workspaceInvitation.delete({
            where: { id: String(invitationId) },
        });

        res.status(204).send();
    } catch (error: any) {
        console.error("Error deleting invitation:", error.message);
        res.status(500).json({ error: "Failed to delete invitation: " + error.message });
    }
};

/**
 * Join a workspace via invitation UUID (no auth middleware needed for workspace)
 * POST /invitations/:invitationId/join
 */
export const joinByInvitation = async (req: Request, res: Response) => {
    try {
        const { invitationId } = req.params;
        const { userId } = req.body;

        if (!userId) {
            res.status(400).json({ error: "userId is required" });
            return;
        }

        const prisma = getPrismaClient();

        const invitation = await prisma.workspaceInvitation.findUnique({
            where: { id: String(invitationId) },
            include: { workspace: { select: { id: true, name: true } } },
        });

        if (!invitation) {
            res.status(404).json({ error: "Invitation not found" });
            return;
        }

        if (new Date() > invitation.expiresAt) {
            res.status(410).json({ error: "This invitation has expired" });
            return;
        }

        const numericUserId = Number(userId);
        const wsId = invitation.workspaceId;

        // Check if already a member
        const existing = await prisma.workspaceMember.findUnique({
            where: { userId_workspaceId: { userId: numericUserId, workspaceId: wsId } },
        });

        if (existing) {
            res.status(400).json({ error: "You are already a member of this workspace" });
            return;
        }

        // Find the default "Member" role
        const memberRole = await prisma.role.findFirst({
            where: { workspaceId: wsId, name: "Member" },
        });

        if (!memberRole) {
            res.status(500).json({ error: "Default Member role not found" });
            return;
        }

        const member = await prisma.workspaceMember.create({
            data: {
                workspaceId: wsId,
                userId: numericUserId,
                roleId: memberRole.id,
            },
            include: { workspace: true },
        });

        res.status(201).json({
            joined: true,
            workspaceId: wsId,
            workspaceName: member.workspace.name,
            member,
        });
    } catch (error: any) {
        console.error("Error joining by invitation:", error.message);
        res.status(500).json({ error: "Failed to join workspace: " + error.message });
    }
};
