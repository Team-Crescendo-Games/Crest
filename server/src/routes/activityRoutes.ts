import { Router } from "express";
import { getActivitiesByTask } from "../controllers/activityController.ts";

const router = Router();

router.get("/", getActivitiesByTask);

export default router;
