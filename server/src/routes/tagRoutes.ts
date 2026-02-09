import { Router } from "express";
import { getTags, createTag, updateTag, deleteTag } from "../controllers/tagController.ts";

const router = Router();

/**
 * @openapi
 * /tags:
 *   get:
 *     tags: [Tags]
 *     summary: Get all tags
 *     responses:
 *       200:
 *         description: List of all tags
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Tag'
 *       500:
 *         description: Server error
 */
router.get("/", getTags);

/**
 * @openapi
 * /tags:
 *   post:
 *     tags: [Tags]
 *     summary: Create a new tag
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
 *                 description: Hex color code (e.g., "#3b82f6")
 *     responses:
 *       201:
 *         description: Tag created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tag'
 *       500:
 *         description: Server error
 */
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
 *       500:
 *         description: Server error
 */
router.patch("/:tagId", updateTag);

/**
 * @openapi
 * /tags/{tagId}:
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
router.delete("/:tagId", deleteTag);

export default router;
