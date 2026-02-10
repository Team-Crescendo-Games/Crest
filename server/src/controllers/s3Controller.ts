import type { Request, Response } from "express";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
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

        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: getS3Key(key),
            ContentType: contentType,
        });

        const url = await getSignedUrl(getS3Client(), command, {
            expiresIn: 300,
        });
        res.json({ url });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
