import { Router } from "express";
import {
    getRoles,
    createRole,
    updateRole,
    deleteRole,
} from "../controllers/roleController.ts";
import { requirePermission } from "../middleware/permissionMiddleware.ts";
import { PERMISSIONS } from "../lib/permissions.ts";

const router = Router({ mergeParams: true });

/**
 * @openapi
 * /workspaces/{workspaceId}/roles:
 *   get:
 *     tags: [Roles]
 *     summary: Get all roles for a workspace
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of roles
 *       500:
 *         description: Server error
 *   post:
 *     tags: [Roles]
 *     summary: Create a new role in a workspace
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               color:
 *                 type: string
 *               permissions:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Role created
 *       400:
 *         description: Duplicate role name
 *       500:
 *         description: Server error
 */
router.get("/", getRoles);
router.post("/", requirePermission(PERMISSIONS.EDIT_MEMBER_ROLES), createRole);

/**
 * @openapi
 * /workspaces/{workspaceId}/roles/{roleId}:
 *   patch:
 *     tags: [Roles]
 *     summary: Update a role
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               color:
 *                 type: string
 *               permissions:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Role updated
 *       400:
 *         description: Cannot modify Admin role or duplicate name
 *       404:
 *         description: Role not found
 *       500:
 *         description: Server error
 *   delete:
 *     tags: [Roles]
 *     summary: Delete a role
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Role deleted
 *       400:
 *         description: Cannot delete Admin role or role with assigned members
 *       404:
 *         description: Role not found
 *       500:
 *         description: Server error
 */
router.patch("/:roleId", requirePermission(PERMISSIONS.EDIT_MEMBER_ROLES), updateRole);
router.delete("/:roleId", requirePermission(PERMISSIONS.EDIT_MEMBER_ROLES), deleteRole);

export default router;
