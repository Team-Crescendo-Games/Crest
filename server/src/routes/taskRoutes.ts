import {Router} from "express";
import {getTasks, getTaskById, createTask, updateTaskStatus, updateTask, getUserTasks, getTasksAssignedToUser, getTasksAuthoredByUser, deleteTask} from "../controllers/taskController.ts";

const router = Router();

router.get("/", getTasks);
router.post("/", createTask);
router.get("/user/:userId", getUserTasks);
router.get("/user/:userId/assigned", getTasksAssignedToUser);
router.get("/user/:userId/authored", getTasksAuthoredByUser);
router.get("/:taskId", getTaskById);
router.delete("/:taskId", deleteTask);
router.patch("/:taskId/status", updateTaskStatus);
router.patch("/:taskId", updateTask);

export default router;