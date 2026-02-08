import { Router } from "express";

import { getUser, getUserById, getUsers, postUser, updateUserProfilePicture } from "../controllers/userController.ts";

const router = Router();

router.get("/", getUsers);
router.post("/", postUser);
router.get("/id/:userId", getUserById);
router.get("/:cognitoId", getUser);
router.patch("/:cognitoId/profile-picture", updateUserProfilePicture);

export default router;
