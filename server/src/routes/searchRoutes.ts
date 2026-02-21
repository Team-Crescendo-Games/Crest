import { Router } from "express";
import { search } from "../controllers/searchController.ts";

const router = Router();

/**
 * @openapi
 * /search:
 * get:
 * tags: [Search]
 * summary: Search across tasks, boards, users, and sprints within a workspace
 * parameters:
 * - in: query
 * name: workspaceId
 * required: true
 * schema:
 * type: integer
 * description: ID of the workspace to scope the search to
 * - in: query
 * name: query
 * required: true
 * schema:
 * type: string
 * description: Search query string
 * - in: query
 * name: categories
 * schema:
 * type: string
 * description: Comma-separated list of categories to search (tasks, boards, users, sprints)
 * responses:
 * 200:
 * description: Search results
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * tasks:
 * type: array
 * items:
 * $ref: '#/components/schemas/Task'
 * boards:
 * type: array
 * items:
 * $ref: '#/components/schemas/Board'
 * users:
 * type: array
 * items:
 * $ref: '#/components/schemas/User'
 * sprints:
 * type: array
 * items:
 * $ref: '#/components/schemas/Sprint'
 * 400:
 * description: Missing workspaceId
 * 500:
 * description: Server error
 */
router.get("/", search);

export default router;
