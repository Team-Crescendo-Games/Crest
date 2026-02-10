import type { Request, Response } from "express";
import { getPrismaClient } from "../lib/prisma.ts";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

const getS3Client = () => new S3Client({ 
    region: process.env.AWS_REGION || "us-west-2",
});

const getS3Key = (taskId: number, attachmentId: number, fileExt: string): string => {
    const stage = process.env.STAGE || "prod";
    return `${stage}/tasks/${taskId}/attachments/${attachmentId}.${fileExt}`;
};

export const createAttachment = async (req: Request, res: Response): Promise<void> => {
    const { taskId, uploadedById, fileName, fileExt } = req.body;

    if (!taskId || !uploadedById || !fileExt) {
        res.status(400).json({ error: "Missing required fields: taskId, uploadedById, fileExt" });
        return;
    }

    try {
        const attachment = await getPrismaClient().attachment.create({
            data: {
                taskId: Number(taskId),
                uploadedById: Number(uploadedById),
                fileName: fileName || null,
                fileExt,
            },
        });

        res.status(201).json(attachment);
    } catch (error: any) {
        console.error("Error creating attachment:", error.message);
        res.status(500).json({ error: `Error creating attachment: ${error.message}` });
    }
};

export const deleteAttachment = async (req: Request, res: Response): Promise<void> => {
    const { attachmentId } = req.params;

    try {
        // Check if attachment exists first
        const existing = await getPrismaClient().attachment.findUnique({
            where: { id: Number(attachmentId) },
        });

        if (!existing) {
            res.status(404).json({ error: "Attachment not found" });
            return;
        }

        // Delete from S3
        const bucketName = process.env.S3_BUCKET_NAME;
        if (bucketName) {
            const s3Key = getS3Key(existing.taskId, existing.id, existing.fileExt);
            try {
                await getS3Client().send(new DeleteObjectCommand({
                    Bucket: bucketName,
                    Key: s3Key,
                }));
            } catch (s3Error: any) {
                console.error("Error deleting S3 object:", s3Error.message);
                // Continue with DB deletion even if S3 fails
            }
        }

        await getPrismaClient().attachment.delete({
            where: { id: Number(attachmentId) },
        });

        res.json({ message: "Attachment deleted successfully" });
    } catch (error: any) {
        console.error("Error deleting attachment:", error.message);
        res.status(500).json({ error: `Error deleting attachment: ${error.message}` });
    }
};
