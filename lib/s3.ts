import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: process.env.S3_REGION ?? "us-east-1",
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
  },
  forcePathStyle: !!process.env.S3_ENDPOINT, // Required for MinIO / non-AWS S3
});

const BUCKET = process.env.S3_BUCKET ?? "crest-attachments";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/json",
  "application/zip",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

/**
 * Generate a presigned PUT URL for direct client-to-S3 upload.
 * Returns the upload URL and the final object key.
 */
export async function getPresignedUploadUrl({
  taskId,
  fileName,
  mimeType,
  fileSize,
}: {
  taskId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}) {
  if (fileSize > MAX_FILE_SIZE) {
    throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`);
  }

  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error("File type not allowed.");
  }

  // Key format: attachments/{taskId}/{timestamp}-{sanitized filename}
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `attachments/${taskId}/${Date.now()}-${sanitized}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: mimeType,
    ContentLength: fileSize,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 min

  // The public URL depends on the S3 setup
  const publicUrl = process.env.S3_PUBLIC_URL
    ? `${process.env.S3_PUBLIC_URL}/${key}`
    : `https://${BUCKET}.s3.${process.env.S3_REGION ?? "us-east-1"}.amazonaws.com/${key}`;

  return { uploadUrl, key, publicUrl };
}

/**
 * Delete an object from S3 by its key.
 */
export async function deleteS3Object(fileUrl: string) {
  // Extract key from the URL
  let key: string;
  if (process.env.S3_PUBLIC_URL && fileUrl.startsWith(process.env.S3_PUBLIC_URL)) {
    key = fileUrl.slice(process.env.S3_PUBLIC_URL.length + 1);
  } else {
    // Try to extract from standard S3 URL
    const match = fileUrl.match(/\.amazonaws\.com\/(.+)$/);
    key = match?.[1] ?? fileUrl;
  }

  await s3.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  );
}

export { MAX_FILE_SIZE, ALLOWED_MIME_TYPES };
