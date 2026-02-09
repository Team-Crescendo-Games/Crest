import { Router } from "express";
import { createComment, toggleCommentResolved } from "../controllers/commentController.ts";

const router = Router();

/**
 * @openapi
 * /comments:
 *   post:
 *     tags: [Comments]
 *     summary: Create a new comment on a task
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [taskId, userId, text]
 *             properties:
 *               taskId:
 *                 type: integer
 *               userId:
 *                 type: integer
 *               text:
 *                 type: string
 *     responses:
 *       201:
 *         description: Comment created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Comment'
 *       500:
 *         description: Server error
 */
router.post("/", createComment);

/**
 * @openapi
 * /comments/{commentId}/resolved:
 *   patch:
 *     tags: [Comments]
 *     summary: Toggle comment resolved status
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Comment resolved status toggled
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Comment'
 *       500:
 *         description: Server error
 */
router.patch("/:commentId/resolved", toggleCommentResolved);

export default router;
