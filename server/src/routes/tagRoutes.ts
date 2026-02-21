import { Router } from "express";
import { getTags, createTag, updateTag, deleteTag } from "../controllers/tagController.ts";

const router = Router();

/**
 * @openapi
 * /tags:
 *   get:
 *     tags: [Tags]
 *     summary: Get all tags for a specific workspace
 *     parameters:
 *       - in: query
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of all tags in the workspace
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Tag'
 *       500:
 *         description: Server error
 *   post:
 *     tags: [Tags]
 *     summary: Create a new tag within a workspace
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, workspaceId]
 *             properties:
 *               name:
 *                 type: string
 *               color:
 *                 type: string
 *                 description: Hex color code (e.g., "#3b82f6")
 *               workspaceId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Tag created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tag'
 *       409:
 *         description: Conflict - Tag name already exists in workspace
 *       500:
 *         description: Server error
 */
router.get("/", getTags);
router.post("/", createTag);

/**
 * @openapi
 * /tags/{tagId}:
 *   patch:
 *     tags: [Tags]
 *     summary: Update a tag
 *     parameters:
 *       - in: path
 *         name: tagId
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
 *     responses:
 *       200:
 *         description: Tag updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tag'
 *       409:
 *         description: Conflict - Tag name already exists in workspace
 *       500:
 *         description: Server error
 *   delete:
 *     tags: [Tags]
 *     summary: Delete a tag
 *     parameters:
 *       - in: path
 *         name: tagId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Tag deleted
 *       500:
 *         description: Server error
 */
router.patch("/:tagId", updateTag);
router.delete("/:tagId", deleteTag);

export default router;
