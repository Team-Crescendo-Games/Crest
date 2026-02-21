import { Router } from "express";
import {
    getBoards,
    createBoard,
    updateBoard,
    deleteBoard,
    archiveBoard,
    reorderBoards,
} from "../controllers/boardController.ts";

const router = Router();

/**
 * @openapi
 * /boards:
 *   get:
 *     tags: [Boards]
 *     summary: Get all boards for a specific workspace
 *     parameters:
 *       - in: query
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of all boards in the workspace
 *       500:
 *         description: Server error
 *   post:
 *     tags: [Boards]
 *     summary: Create a new board
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
 *               description:
 *                 type: string
 *               workspaceId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Board created
 *       500:
 *         description: Server error
 */
router.get("/", getBoards);
router.post("/", createBoard);

/**
 * @openapi
 * /boards/reorder:
 *   patch:
 *     tags: [Boards]
 *     summary: Reorder boards within a workspace
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderedIds, workspaceId]
 *             properties:
 *               orderedIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *               workspaceId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Boards reordered
 *       500:
 *         description: Server error
 */
router.patch("/reorder", reorderBoards);

/**
 * @openapi
 * /boards/{boardId}:
 *   patch:
 *     tags: [Boards]
 *     summary: Update a board
 *     parameters:
 *       - in: path
 *         name: boardId
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
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Board updated
 *       500:
 *         description: Server error
 *   delete:
 *     tags: [Boards]
 *     summary: Delete a board
 *     parameters:
 *       - in: path
 *         name: boardId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Board deleted
 *       500:
 *         description: Server error
 */
router.patch("/:boardId", updateBoard);
router.delete("/:boardId", deleteBoard);

/**
 * @openapi
 * /boards/{boardId}/archive:
 *   patch:
 *     tags: [Boards]
 *     summary: Archive a board (set isActive to false)
 *     parameters:
 *       - in: path
 *         name: boardId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Board archived
 *       500:
 *         description: Server error
 */
router.patch("/:boardId/archive", archiveBoard);

export default router;
