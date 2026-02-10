import { Router } from "express";
import {
    getTasks,
    getTaskById,
    createTask,
    updateTaskStatus,
    updateTask,
    getUserTasks,
    getTasksAssignedToUser,
    getTasksAuthoredByUser,
    deleteTask,
} from "../controllers/taskController.ts";

const router = Router();

/**
 * @openapi
 * /tasks:
 *   get:
 *     tags: [Tasks]
 *     summary: Get tasks for a project
 *     parameters:
 *       - in: query
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Project ID to filter tasks
 *     responses:
 *       200:
 *         description: List of tasks
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Task'
 *       500:
 *         description: Server error
 */
router.get("/", getTasks);

/**
 * @openapi
 * /tasks:
 *   post:
 *     tags: [Tasks]
 *     summary: Create a new task
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, projectId, authorUserId]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: integer
 *               priority:
 *                 type: string
 *                 enum: [Urgent, High, Medium, Low, Backlog]
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               points:
 *                 type: integer
 *               projectId:
 *                 type: integer
 *               authorUserId:
 *                 type: integer
 *               parentTaskId:
 *                 type: integer
 *               tagIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *               sprintIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *               assigneeIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       201:
 *         description: Task created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       500:
 *         description: Server error
 */
router.post("/", createTask);

/**
 * @openapi
 * /tasks/user/{userId}:
 *   get:
 *     tags: [Tasks]
 *     summary: Get all tasks related to a user (authored or assigned)
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of tasks
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Task'
 *       500:
 *         description: Server error
 */
router.get("/user/:userId", getUserTasks);

/**
 * @openapi
 * /tasks/user/{userId}/assigned:
 *   get:
 *     tags: [Tasks]
 *     summary: Get tasks assigned to a user
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of assigned tasks
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Task'
 *       500:
 *         description: Server error
 */
router.get("/user/:userId/assigned", getTasksAssignedToUser);

/**
 * @openapi
 * /tasks/user/{userId}/authored:
 *   get:
 *     tags: [Tasks]
 *     summary: Get tasks authored by a user
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of authored tasks
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Task'
 *       500:
 *         description: Server error
 */
router.get("/user/:userId/authored", getTasksAuthoredByUser);

/**
 * @openapi
 * /tasks/{taskId}:
 *   get:
 *     tags: [Tasks]
 *     summary: Get a task by ID
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Task details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       404:
 *         description: Task not found
 *       500:
 *         description: Server error
 */
router.get("/:taskId", getTaskById);

/**
 * @openapi
 * /tasks/{taskId}:
 *   delete:
 *     tags: [Tasks]
 *     summary: Delete a task
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Task deleted
 *       500:
 *         description: Server error
 */
router.delete("/:taskId", deleteTask);

/**
 * @openapi
 * /tasks/{taskId}/status:
 *   patch:
 *     tags: [Tasks]
 *     summary: Update task status
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 description: New status name
 *               userId:
 *                 type: integer
 *                 description: User making the change (for activity log)
 *     responses:
 *       200:
 *         description: Task status updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       500:
 *         description: Server error
 */
router.patch("/:taskId/status", updateTaskStatus);

/**
 * @openapi
 * /tasks/{taskId}:
 *   patch:
 *     tags: [Tasks]
 *     summary: Update a task
 *     parameters:
 *       - in: path
 *         name: taskId
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
 *               description:
 *                 type: string
 *               status:
 *                 type: integer
 *               priority:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               points:
 *                 type: integer
 *               tagIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *               subtaskIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *               sprintIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *               assigneeIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *               userId:
 *                 type: integer
 *                 description: User making the change (for activity log)
 *     responses:
 *       200:
 *         description: Task updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       500:
 *         description: Server error
 */
router.patch("/:taskId", updateTask);

export default router;
