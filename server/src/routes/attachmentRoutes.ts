import { Router } from "express";
import { createAttachment, deleteAttachment } from "../controllers/attachmentController.ts";

const router = Router();

/**
 * @openapi
 * /attachments:
 *   post:
 *     tags: [Attachments]
 *     summary: Create an attachment record
 *     description: Creates a database record for an attachment. File upload should be done separately via S3 presigned URL.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [taskId, uploadedById, fileName, fileExt]
 *             properties:
 *               taskId:
 *                 type: integer
 *               uploadedById:
 *                 type: integer
 *               fileName:
 *                 type: string
 *               fileExt:
 *                 type: string
 *                 description: File extension (e.g., "pdf", "png")
 *     responses:
 *       201:
 *         description: Attachment record created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Attachment'
 *       500:
 *         description: Server error
 */
router.post("/", createAttachment);

/**
 * @openapi
 * /attachments/{attachmentId}:
 *   delete:
 *     tags: [Attachments]
 *     summary: Delete an attachment
 *     parameters:
 *       - in: path
 *         name: attachmentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Attachment deleted
 *       500:
 *         description: Server error
 */
router.delete("/:attachmentId", deleteAttachment);

export default router;
