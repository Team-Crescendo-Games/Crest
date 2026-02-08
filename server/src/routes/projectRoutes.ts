import {Router} from "express";
import {getProjects, createProject, updateProject, deleteProject, archiveProject} from "../controllers/projectController.ts";

const router = Router();

router.get("/", getProjects);
router.post("/", createProject);
router.patch("/:projectId", updateProject);
router.patch("/:projectId/archive", archiveProject);
router.delete("/:projectId", deleteProject);

export default router;
