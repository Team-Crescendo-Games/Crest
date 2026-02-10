import { Router } from "express";
import { getPresignedViewUrl, getPresignedDownloadUrl, getPresignedUploadUrl } from "../controllers/s3Controller.ts";

const router = Router();

/**
 * @openapi
 * /s3/presigned:
 *   get:
 *     tags: [S3]
 *     summary: Get a presigned URL for viewing/downloading a file
 *     parameters:
 *       - in: query
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: S3 object key (e.g., "users/1/profile.jpg" or "tasks/5/attachments/10.pdf")
 *     responses:
 *       200:
 *         description: Presigned URL for viewing
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                   description: Presigned URL valid for ~1 hour
 *       500:
 *         description: Server error
 */
router.get("/presigned", getPresignedViewUrl);

/**
 * @openapi
 * /s3/presigned/download:
 *   get:
 *     tags: [S3]
 *     summary: Get a presigned URL for downloading a file with Content-Disposition header
 *     parameters:
 *       - in: query
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: S3 object key
 *       - in: query
 *         name: fileName
 *         required: false
 *         schema:
 *           type: string
 *         description: Original filename for the download
 *     responses:
 *       200:
 *         description: Presigned URL for downloading
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                   description: Presigned URL with Content-Disposition attachment header
 *       500:
 *         description: Server error
 */
router.get("/presigned/download", getPresignedDownloadUrl);

/**
 * @openapi
 * /s3/presigned/upload:
 *   post:
 *     tags: [S3]
 *     summary: Get a presigned URL for uploading a file
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [key, contentType]
 *             properties:
 *               key:
 *                 type: string
 *                 description: S3 object key for the upload
 *               contentType:
 *                 type: string
 *                 description: MIME type (e.g., "image/jpeg", "application/pdf")
 *     responses:
 *       200:
 *         description: Presigned URL for uploading
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                   description: Presigned PUT URL
 *       500:
 *         description: Server error
 */
router.post("/presigned/upload", getPresignedUploadUrl);

export default router;
