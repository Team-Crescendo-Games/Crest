import { Router } from "express";
import { getActivitiesByTask } from "../controllers/activityController.ts";

const router = Router();

/**
 * @openapi
 * /activities:
 *   get:
 *     tags: [Activities]
 *     summary: Get activity log for a task
 *     parameters:
 *       - in: query
 *         name: taskId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Task ID to get activities for
 *     responses:
 *       200:
 *         description: List of activities for the task
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 allOf:
 *                   - $ref: '#/components/schemas/Activity'
 *                   - type: object
 *                     properties:
 *                       user:
 *                         type: object
 *                         properties:
 *                           userId:
 *                             type: integer
 *                           username:
 *                             type: string
 *       500:
 *         description: Server error
 */
router.get("/", getActivitiesByTask);

export default router;
