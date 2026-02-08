import { Router } from "express";
import { createComment, toggleCommentResolved } from "../controllers/commentController.ts";

const router = Router();

router.post("/", createComment);
router.patch("/:commentId/resolved", toggleCommentResolved);

export default router;
