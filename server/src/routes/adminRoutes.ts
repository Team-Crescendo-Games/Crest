import { Router } from "express";
import { adminUpdateUser, adminDeleteUser } from "../controllers/adminController.ts";
import { requireSystemAdmin } from "../middleware/requireSystemAdmin.ts";

const router = Router();

// All admin routes require system admin authentication
router.use(requireSystemAdmin());

/**
 * @openapi
 * /admin/users/{userId}:
 *   patch:
 *     tags: [Admin]
 *     summary: Admin update user details
 *     description: Allows admins to update any user's profile information
 *     parameters:
 *       - in: path
 *         name: userId
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
 *               username:
 *                 type: string
 *               fullName:
 *                 type: string
 *               cognitoId:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       500:
 *         description: Server error
 */
router.patch("/users/:userId", adminUpdateUser);
router.delete("/users/:userId", adminDeleteUser);

export default router;
