import { Router } from "express";
import {
  getSprints,
  getSprint,
  createSprint,
  updateSprint,
  deleteSprint,
  addTaskToSprint,
  removeTaskFromSprint,
  duplicateSprint,
  archiveSprint
} from "../controllers/sprintController.ts";

const router = Router();

// Sprint CRUD routes
router.get("/", getSprints);
router.get("/:sprintId", getSprint);
router.post("/", createSprint);
router.patch("/:sprintId", updateSprint);
router.delete("/:sprintId", deleteSprint);

// Sprint duplication
router.post("/:sprintId/duplicate", duplicateSprint);

// Sprint archive
router.patch("/:sprintId/archive", archiveSprint);

// Sprint-Task association routes
router.post("/:sprintId/tasks/:taskId", addTaskToSprint);
router.delete("/:sprintId/tasks/:taskId", removeTaskFromSprint);

export default router;
