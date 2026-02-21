import { Router } from "express";
import { getPointsAnalytics } from "../controllers/analyticsController.ts";

const router = Router();

/**
 * @openapi
 * /analytics/points:
 * get:
 * tags: [Analytics]
 * summary: Get points analytics for a user within a specific workspace
 * description: Returns aggregated points data for the specified time period, scoped to the workspace. Points are counted from tasks that were moved to "Done" status where the user is assigned.
 * parameters:
 * - in: query
 * name: userId
 * required: true
 * schema:
 * type: integer
 * description: User ID to get analytics for
 * - in: query
 * name: workspaceId
 * required: true
 * schema:
 * type: integer
 * description: Workspace ID to scope the analytics
 * - in: query
 * name: groupBy
 * required: true
 * schema:
 * type: string
 * enum: [week, month, year]
 * description: Time period for aggregation
 * - in: query
 * name: startDate
 * required: true
 * schema:
 * type: string
 * format: date-time
 * description: Start of date range (ISO string)
 * - in: query
 * name: endDate
 * required: true
 * schema:
 * type: string
 * format: date-time
 * description: End of date range (ISO string)
 * responses:
 * 200:
 * description: Array of points data points
 * content:
 * application/json:
 * schema:
 * type: array
 * items:
 * type: object
 * properties:
 * date:
 * type: string
 * format: date-time
 * description: ISO date string for the start of the period
 * points:
 * type: integer
 * description: Total points completed in this period
 * label:
 * type: string
 * description: Display label (e.g., "Mon", "Week 1", "Jan")
 * 400:
 * description: Invalid parameters
 * 500:
 * description: Server error
 */
router.get("/points", getPointsAnalytics);

export default router;
