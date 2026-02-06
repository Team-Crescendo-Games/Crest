import {Router} from "express";
import {getTasks, createTask, updateTaskStatus, updateTask, getUserTasks} from "../controllers/taskController.ts";

const router = Router();

router.get("/", getTasks);
router.post("/", createTask);
router.patch("/:taskId/status", updateTaskStatus);
router.patch("/:taskId", updateTask);
router.get("/user/:userId", getUserTasks);

export default router;