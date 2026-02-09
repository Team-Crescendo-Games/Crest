import { Router } from "express";

import { getUser, getUserById, getUsers, postUser, updateUserProfilePicture, updateUserProfile } from "../controllers/userController.ts";

const router = Router();

router.get("/", getUsers);
router.post("/", postUser);
router.get("/id/:userId", getUserById);
router.get("/:cognitoId", getUser);
router.patch("/:cognitoId/profile-picture", updateUserProfilePicture);
router.patch("/:cognitoId/profile", updateUserProfile);

export default router;
