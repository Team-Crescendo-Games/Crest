import { Router } from "express";
import { toggleReaction, getReactionsByComment } from "../controllers/reactionController.ts";

const router = Router();

/**
 * @openapi
 * /reactions/toggle:
 *   post:
 *     tags: [Reactions]
 *     summary: Toggle a reaction on a comment
 *     description: Adds the reaction if it doesn't exist, removes it if it does
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [commentId, userId, emoji]
 *             properties:
 *               commentId:
 *                 type: integer
 *               userId:
 *                 type: integer
 *               emoji:
 *                 type: string
 *                 description: Emoji character or identifier
 *     responses:
 *       200:
 *         description: Reaction toggled (returns reaction if added, null if removed)
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/CommentReaction'
 *                 - type: "null"
 *       500:
 *         description: Server error
 */
router.post("/toggle", toggleReaction);

/**
 * @openapi
 * /reactions/comment/{commentId}:
 *   get:
 *     tags: [Reactions]
 *     summary: Get all reactions for a comment
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of reactions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CommentReaction'
 *       500:
 *         description: Server error
 */
router.get("/comment/:commentId", getReactionsByComment);

export default router;
