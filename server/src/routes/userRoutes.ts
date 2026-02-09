import { Router } from "express";
import { getUser, getUserById, getUsers, postUser, updateUserProfilePicture, updateUserProfile } from "../controllers/userController.ts";

const router = Router();

/**
 * @openapi
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: Get all users
 *     responses:
 *       200:
 *         description: List of all users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       500:
 *         description: Server error
 */
router.get("/", getUsers);

/**
 * @openapi
 * /users:
 *   post:
 *     tags: [Users]
 *     summary: Create a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [cognitoId, username]
 *             properties:
 *               cognitoId:
 *                 type: string
 *               username:
 *                 type: string
 *               fullName:
 *                 type: string
 *               email:
 *                 type: string
 *               profilePictureExt:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       500:
 *         description: Server error
 */
router.post("/", postUser);

/**
 * @openapi
 * /users/id/{userId}:
 *   get:
 *     tags: [Users]
 *     summary: Get user by internal user ID
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.get("/id/:userId", getUserById);

/**
 * @openapi
 * /users/{cognitoId}:
 *   get:
 *     tags: [Users]
 *     summary: Get user by Cognito ID
 *     parameters:
 *       - in: path
 *         name: cognitoId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.get("/:cognitoId", getUser);

/**
 * @openapi
 * /users/{cognitoId}/profile-picture:
 *   patch:
 *     tags: [Users]
 *     summary: Update user profile picture extension
 *     parameters:
 *       - in: path
 *         name: cognitoId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [profilePictureExt]
 *             properties:
 *               profilePictureExt:
 *                 type: string
 *                 description: File extension (e.g., "jpg", "png")
 *     responses:
 *       200:
 *         description: Profile picture updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       500:
 *         description: Server error
 */
router.patch("/:cognitoId/profile-picture", updateUserProfilePicture);

/**
 * @openapi
 * /users/{cognitoId}/profile:
 *   patch:
 *     tags: [Users]
 *     summary: Update user profile
 *     parameters:
 *       - in: path
 *         name: cognitoId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       500:
 *         description: Server error
 */
router.patch("/:cognitoId/profile", updateUserProfile);

export default router;
