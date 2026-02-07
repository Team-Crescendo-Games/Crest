import { Router } from "express";
import { getPresignedViewUrl, getPresignedUploadUrl } from "../controllers/s3Controller.ts";

const router = Router();

router.get("/presigned", getPresignedViewUrl);
router.post("/presigned/upload", getPresignedUploadUrl);

export default router;
