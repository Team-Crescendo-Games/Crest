import type { Request, Response, NextFunction } from "express";
import { getPrismaClient } from "../lib/prisma.ts";
import { hasPermission, ALL_PERMISSIONS } from "../lib/permissions.ts";

export function requireAdmin() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workspaceId = Number(req.params.workspaceId || req.query.workspaceId || req.body.workspaceId);
      const userId = Number(req.query.userId || req.body.userId);

      if (!workspaceId || !userId) {
        res.status(400).json({ error: "workspaceId and userId are required" });
        return;
      }

      const member = await getPrismaClient().workspaceMember.findUnique({
        where: { userId_workspaceId: { userId, workspaceId } },
        include: { role: true },
      });

      if (!member || !member.role) {
        res.status(403).json({ error: "Not a member of this workspace" });
        return;
      }

      if (member.role.name !== "Admin" && member.role.permissions !== ALL_PERMISSIONS) {
        res.status(403).json({ error: "Only the Admin can delete the workspace" });
        return;
      }

      next();
    } catch (error: any) {
      res.status(500).json({ error: "Permission check failed: " + error.message });
    }
  };
}

export function requirePermission(permission: number) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workspaceId = Number(req.params.workspaceId || req.query.workspaceId || req.body.workspaceId);
      const userId = Number(req.query.userId || req.body.userId);

      if (!workspaceId || !userId) {
        res.status(400).json({ error: "workspaceId and userId are required" });
        return;
      }

      const member = await getPrismaClient().workspaceMember.findUnique({
        where: { userId_workspaceId: { userId, workspaceId } },
        include: { role: true },
      });

      if (!member || !member.role) {
        res.status(403).json({ error: "Not a member of this workspace" });
        return;
      }

      if (!hasPermission(member.role.permissions, permission)) {
        res.status(403).json({ error: "Insufficient permissions" });
        return;
      }

      next();
    } catch (error: any) {
      res.status(500).json({ error: "Permission check failed: " + error.message });
    }
  };
}
