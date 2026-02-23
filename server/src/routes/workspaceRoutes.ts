import { Router } from "express";
import {
    adminGetAllWorkspaces,
    adminUpdateWorkspace,
    adminDeleteWorkspace,
    getUserWorkspaces,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    getWorkspaceMembers,
    addWorkspaceMember,
    removeWorkspaceMember,
    updateMemberRole,
    updateWorkspaceIcon,
    updateWorkspaceHeader,
} from "../controllers/workspaceController.ts";
import { requirePermission, requireAdmin } from "../middleware/permissionMiddleware.ts";
import { requireSystemAdmin } from "../middleware/requireSystemAdmin.ts";
import { PERMISSIONS } from "../lib/permissions.ts";
import roleRoutes from "./roleRoutes.ts";
import { workspaceInvitationRouter } from "./invitationRoutes.ts";

const router = Router();

/**
 * @openapi
 * /workspaces:
 *   get:
 *     tags: [Workspaces]
 *     summary: Get all workspaces for a user
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *   post:
 *     tags: [Workspaces]
 *     summary: Create a new workspace and add creator as ADMIN
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, userId]
 *             properties:
 *               name:
 *                 type: string
 *               userId:
 *                 type: integer
 */
router.get("/admin/all", requireSystemAdmin(), adminGetAllWorkspaces);
router.patch("/admin/:workspaceId", requireSystemAdmin(), adminUpdateWorkspace);
router.delete("/admin/:workspaceId", requireSystemAdmin(), adminDeleteWorkspace);
router.get("/", getUserWorkspaces);
router.post("/", createWorkspace);

/**
 * @openapi
 * /workspaces/{workspaceId}:
 *   patch:
 *     tags: [Workspaces]
 *     summary: Update workspace details
 *   delete:
 *     tags: [Workspaces]
 *     summary: Delete a workspace
 */
router.patch("/:workspaceId", requirePermission(PERMISSIONS.EDIT_INFO), updateWorkspace);
router.patch("/:workspaceId/icon", requirePermission(PERMISSIONS.EDIT_INFO), updateWorkspaceIcon);
router.patch(
    "/:workspaceId/header",
    requirePermission(PERMISSIONS.EDIT_INFO),
    updateWorkspaceHeader
);
router.delete("/:workspaceId", requireAdmin(), deleteWorkspace);

/**
 * @openapi
 * /workspaces/{workspaceId}/members:
 *   get:
 *     tags: [Workspace Members]
 *     summary: Get all members of a workspace
 *   post:
 *     tags: [Workspace Members]
 *     summary: Add a user to a workspace
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId:
 *                 type: integer
 *               role:
 *                 type: string
 */
router.get("/:workspaceId/members", getWorkspaceMembers);
router.post("/:workspaceId/members", requirePermission(PERMISSIONS.INVITE), addWorkspaceMember);

/**
 * @openapi
 * /workspaces/{workspaceId}/members/{userId}:
 *   delete:
 *     tags: [Workspace Members]
 *     summary: Remove a user from a workspace
 */
router.delete("/:workspaceId/members/:userId", removeWorkspaceMember);

/**
 * @openapi
 * /workspaces/{workspaceId}/members/{userId}/role:
 *   patch:
 *     tags: [Workspace Members]
 *     summary: Update a member's role in the workspace
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [roleId]
 *             properties:
 *               roleId:
 *                 type: integer
 */
router.patch(
    "/:workspaceId/members/:userId/role",
    requirePermission(PERMISSIONS.EDIT_MEMBER_ROLES),
    updateMemberRole
);

// Role routes nested under workspace
router.use("/:workspaceId/roles", roleRoutes);

// Invitation routes nested under workspace
router.use("/:workspaceId/invitations", workspaceInvitationRouter);

export default router;
