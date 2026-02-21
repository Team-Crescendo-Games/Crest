import { Router } from "express";
import {
    getUserWorkspaces,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    getWorkspaceMembers,
    addWorkspaceMember,
    removeWorkspaceMember,
} from "../controllers/workspaceController.ts";

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
router.patch("/:workspaceId", updateWorkspace);
router.delete("/:workspaceId", deleteWorkspace);

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
router.post("/:workspaceId/members", addWorkspaceMember);

/**
 * @openapi
 * /workspaces/{workspaceId}/members/{userId}:
 *   delete:
 *     tags: [Workspace Members]
 *     summary: Remove a user from a workspace
 */
router.delete("/:workspaceId/members/:userId", removeWorkspaceMember);

export default router;
