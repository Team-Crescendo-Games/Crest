import type { Request, Response } from "express";
import { getPrismaClient } from "../lib/prisma.ts";

/**
 * Get discoverable workspaces (joinPolicy=1 or joinPolicy=2) that the user is NOT a member of
 */
export const getDiscoverableWorkspaces = async (req: Request, res: Response) => {
    try {
        const { userId } = req.query;
        if (!userId) {
            res.status(400).json({ error: "userId is required" });
            return;
        }

        const prisma = getPrismaClient();
        const uid = Number(userId);

        const workspaces = await prisma.workspace.findMany({
            where: {
                joinPolicy: { in: [1, 2] },
                members: { none: { userId: uid } },
            },
            include: { _count: { select: { members: true } } },
        });

        // Also fetch pending applications for this user
        const pendingApps = await prisma.workspaceApplication.findMany({
            where: { userId: uid, status: 0 },
            select: { workspaceId: true },
        });
        const pendingSet = new Set(pendingApps.map((a) => a.workspaceId));

        const result = workspaces.map((ws) => ({
            ...ws,
            memberCount: ws._count.members,
            hasPendingApplication: pendingSet.has(ws.id),
        }));

        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Apply to join a workspace (creates a pending application)
 */
export const applyToWorkspace = async (req: Request, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const { userId, message } = req.body;

        if (!userId) {
            res.status(400).json({ error: "userId is required" });
            return;
        }

        const prisma = getPrismaClient();
        const wsId = Number(workspaceId);
        const uid = Number(userId);

        // Check workspace exists and allows applications
        const workspace = await prisma.workspace.findUnique({ where: { id: wsId } });
        if (!workspace) {
            res.status(404).json({ error: "Workspace not found" });
            return;
        }
        if (workspace.joinPolicy === 0) {
            res.status(400).json({ error: "This workspace is invite-only" });
            return;
        }

        // Check not already a member
        const existing = await prisma.workspaceMember.findUnique({
            where: { userId_workspaceId: { userId: uid, workspaceId: wsId } },
        });
        if (existing) {
            res.status(400).json({ error: "Already a member" });
            return;
        }

        // For discoverable workspaces (joinPolicy=2), add directly
        if (workspace.joinPolicy === 2) {
            const memberRole = await prisma.role.findFirst({
                where: { workspaceId: wsId, name: "Member" },
            });
            if (!memberRole) {
                res.status(500).json({ error: "Default Member role not found" });
                return;
            }
            const member = await prisma.workspaceMember.create({
                data: { workspaceId: wsId, userId: uid, roleId: memberRole.id },
                include: { role: true, user: true },
            });
            res.status(201).json({ joined: true, member });
            return;
        }

        // For apply-to-join (joinPolicy=1), create application
        const application = await prisma.workspaceApplication.create({
            data: { workspaceId: wsId, userId: uid, message: message || null },
            include: { user: true, workspace: true },
        });

        res.status(201).json({ joined: false, application });
    } catch (error: any) {
        if (error.code === "P2002") {
            res.status(400).json({ error: "You already have a pending application" });
            return;
        }
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get applications for a workspace (for admins/managers)
 */
export const getWorkspaceApplications = async (req: Request, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const { status } = req.query;

        const where: any = { workspaceId: Number(workspaceId) };
        if (status !== undefined) where.status = Number(status);

        const applications = await getPrismaClient().workspaceApplication.findMany({
            where,
            include: { user: true },
            orderBy: { createdAt: "desc" },
        });

        res.json(applications);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Approve or reject an application
 */
export const resolveApplication = async (req: Request, res: Response) => {
    try {
        const { workspaceId, applicationId } = req.params;
        const { action } = req.body; // "approve" or "reject"

        if (!["approve", "reject"].includes(action)) {
            res.status(400).json({ error: "action must be 'approve' or 'reject'" });
            return;
        }

        const prisma = getPrismaClient();
        const wsId = Number(workspaceId);
        const appId = Number(applicationId);

        const application = await prisma.workspaceApplication.findFirst({
            where: { id: appId, workspaceId: wsId, status: 0 },
        });

        if (!application) {
            res.status(404).json({ error: "Application not found or already resolved" });
            return;
        }

        if (action === "approve") {
            const memberRole = await prisma.role.findFirst({
                where: { workspaceId: wsId, name: "Member" },
            });
            if (!memberRole) {
                res.status(500).json({ error: "Default Member role not found" });
                return;
            }

            await prisma.$transaction([
                prisma.workspaceApplication.update({
                    where: { id: appId },
                    data: { status: 1 },
                }),
                prisma.workspaceMember.create({
                    data: {
                        workspaceId: wsId,
                        userId: application.userId,
                        roleId: memberRole.id,
                    },
                }),
            ]);
        } else {
            await prisma.workspaceApplication.update({
                where: { id: appId },
                data: { status: 2 },
            });
        }

        const updated = await prisma.workspaceApplication.findUnique({
            where: { id: appId },
            include: { user: true },
        });

        res.json(updated);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
