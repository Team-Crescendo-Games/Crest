import { Router } from "express";
import {
    getSprints,
    getSprint,
    createSprint,
    updateSprint,
    deleteSprint,
    addTaskToSprint,
    removeTaskFromSprint,
    duplicateSprint,
    archiveSprint,
} from "../controllers/sprintController.ts";

const router = Router();

/**
 * @openapi
 * /sprints:
 *   get:
 *     tags: [Sprints]
 *     summary: Get all sprints for a workspace
 *     parameters:
 *       - in: query
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of all sprints with task counts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 allOf:
 *                   - $ref: '#/components/schemas/Sprint'
 *                   - type: object
 *                     properties:
 *                       _count:
 *                         type: object
 *                         properties:
 *                           sprintTasks:
 *                             type: integer
 *       500:
 *         description: Server error
 *   post:
 *     tags: [Sprints]
 *     summary: Create a new sprint in a workspace
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, workspaceId]
 *             properties:
 *               title:
 *                 type: string
 *               workspaceId:
 *                 type: integer
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Sprint created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Sprint'
 *       500:
 *         description: Server error
 */
router.get("/", getSprints);
router.post("/", createSprint);

/**
 * @openapi
 * /sprints/{sprintId}:
 *   get:
 *     tags: [Sprints]
 *     summary: Get a sprint by ID with its tasks
 *     parameters:
 *       - in: path
 *         name: sprintId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Sprint details with tasks
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Sprint'
 *                 - type: object
 *                   properties:
 *                     tasks:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Task'
 *       404:
 *         description: Sprint not found
 *       500:
 *         description: Server error
 *   patch:
 *     tags: [Sprints]
 *     summary: Update a sprint
 *     parameters:
 *       - in: path
 *         name: sprintId
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
 *               title:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Sprint updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Sprint'
 *       500:
 *         description: Server error
 *   delete:
 *     tags: [Sprints]
 *     summary: Delete a sprint
 *     parameters:
 *       - in: path
 *         name: sprintId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Sprint deleted
 *       500:
 *         description: Server error
 */
router.get("/:sprintId", getSprint);
router.patch("/:sprintId", updateSprint);
router.delete("/:sprintId", deleteSprint);

/**
 * @openapi
 * /sprints/{sprintId}/duplicate:
 *   post:
 *     tags: [Sprints]
 *     summary: Duplicate a sprint with its tasks
 *     parameters:
 *       - in: path
 *         name: sprintId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Title for the new sprint (defaults to "Copy of [original]")
 *               includeFinishedTasks:
 *                 type: boolean
 *                 description: Whether to include completed tasks (default false)
 *     responses:
 *       201:
 *         description: Sprint duplicated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Sprint'
 *       500:
 *         description: Server error
 */
router.post("/:sprintId/duplicate", duplicateSprint);

/**
 * @openapi
 * /sprints/{sprintId}/archive:
 *   patch:
 *     tags: [Sprints]
 *     summary: Archive a sprint (set isActive to false)
 *     parameters:
 *       - in: path
 *         name: sprintId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Sprint archived
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Sprint'
 *       500:
 *         description: Server error
 */
router.patch("/:sprintId/archive", archiveSprint);

/**
 * @openapi
 * /sprints/{sprintId}/tasks/{taskId}:
 *   post:
 *     tags: [Sprints]
 *     summary: Add a task to a sprint
 *     parameters:
 *       - in: path
 *         name: sprintId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       201:
 *         description: Task added to sprint
 *       500:
 *         description: Server error
 *   delete:
 *     tags: [Sprints]
 *     summary: Remove a task from a sprint
 *     parameters:
 *       - in: path
 *         name: sprintId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Task removed from sprint
 *       500:
 *         description: Server error
 */
router.post("/:sprintId/tasks/:taskId", addTaskToSprint);
router.delete("/:sprintId/tasks/:taskId", removeTaskFromSprint);

export default router;
