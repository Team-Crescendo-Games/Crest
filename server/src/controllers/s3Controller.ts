import type { Request, Response } from "express";
import {
    S3Client,
    GetObjectCommand,
    PutObjectCommand,
    ListObjectsV2Command,
    DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const getS3Client = () =>
    new S3Client({
        region: process.env.AWS_REGION || "us-west-2",
        // Disable response checksum validation to avoid x-amz-checksum-mode header
        requestChecksumCalculation: "WHEN_REQUIRED",
        responseChecksumValidation: "WHEN_REQUIRED",
    });

const getS3Key = (key: string): string => {
    const stage = process.env.STAGE || "prod";
    return `${stage}/${key}`;
};

export const getPresignedViewUrl = async (req: Request, res: Response) => {
    try {
        const key = req.query.key as string;

        if (!key) {
            res.status(400).json({ error: "Missing key parameter" });
            return;
        }

        const bucketName = process.env.S3_BUCKET_NAME;
        const s3Key = getS3Key(key);

        console.log("S3 presigned URL request:", { bucketName, s3Key, stage: process.env.STAGE });

        if (!bucketName) {
            res.status(500).json({ error: "S3_BUCKET_NAME environment variable not set" });
            return;
        }

        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: s3Key,
        });

        const url = await getSignedUrl(getS3Client(), command, {
            expiresIn: 3600,
        });
        console.log("Generated presigned URL:", url);
        res.json({ url });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getPresignedDownloadUrl = async (req: Request, res: Response) => {
    try {
        const key = req.query.key as string;
        const fileName = req.query.fileName as string;

        if (!key) {
            res.status(400).json({ error: "Missing key parameter" });
            return;
        }

        const bucketName = process.env.S3_BUCKET_NAME;
        const s3Key = getS3Key(key);

        if (!bucketName) {
            res.status(500).json({ error: "S3_BUCKET_NAME environment variable not set" });
            return;
        }

        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: s3Key,
            ResponseContentDisposition: fileName
                ? `attachment; filename="${fileName}"`
                : "attachment",
        });

        const url = await getSignedUrl(getS3Client(), command, {
            expiresIn: 3600,
        });
        res.json({ url });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getPresignedUploadUrl = async (req: Request, res: Response) => {
    try {
        const { key, contentType } = req.body;

        if (!key) {
            res.status(400).json({ error: "Missing key parameter" });
            return;
        }

        const bucketName = process.env.S3_BUCKET_NAME;
        if (!bucketName) {
            res.status(500).json({ error: "S3_BUCKET_NAME environment variable not set" });
            return;
        }

        const s3Key = getS3Key(key);
        const s3 = getS3Client();

        // If uploading a profile picture, delete any existing profile.* files first
        const profileMatch = key.match(/^(users\/\d+\/)profile\.\w+$/);
        if (profileMatch) {
            const prefix = getS3Key(profileMatch[1] + "profile.");
            const listCommand = new ListObjectsV2Command({
                Bucket: bucketName,
                Prefix: prefix,
            });
            const listed = await s3.send(listCommand);
            if (listed.Contents && listed.Contents.length > 0) {
                const deleteCommand = new DeleteObjectsCommand({
                    Bucket: bucketName,
                    Delete: {
                        Objects: listed.Contents.map((obj) => ({ Key: obj.Key })),
                    },
                });
                await s3.send(deleteCommand);
            }
        }

        // If uploading a workspace icon, delete any existing icon.* files first
        const iconMatch = key.match(/^(workspaces\/\d+\/)icon\.\w+$/);
        if (iconMatch) {
            const prefix = getS3Key(iconMatch[1] + "icon.");
            const listCommand = new ListObjectsV2Command({
                Bucket: bucketName,
                Prefix: prefix,
            });
            const listed = await s3.send(listCommand);
            if (listed.Contents && listed.Contents.length > 0) {
                const deleteCommand = new DeleteObjectsCommand({
                    Bucket: bucketName,
                    Delete: {
                        Objects: listed.Contents.map((obj) => ({ Key: obj.Key })),
                    },
                });
                await s3.send(deleteCommand);
            }
        }

        // If uploading a workspace header, delete any existing header.* files first
        const headerMatch = key.match(/^(workspaces\/\d+\/)header\.\w+$/);
        if (headerMatch) {
            const prefix = getS3Key(headerMatch[1] + "header.");
            const listCommand = new ListObjectsV2Command({
                Bucket: bucketName,
                Prefix: prefix,
            });
            const listed = await s3.send(listCommand);
            if (listed.Contents && listed.Contents.length > 0) {
                const deleteCommand = new DeleteObjectsCommand({
                    Bucket: bucketName,
                    Delete: {
                        Objects: listed.Contents.map((obj) => ({ Key: obj.Key })),
                    },
                });
                await s3.send(deleteCommand);
            }
        }

        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: s3Key,
            ContentType: contentType,
        });

        const url = await getSignedUrl(s3, command, {
            expiresIn: 300,
        });
        res.json({ url });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
