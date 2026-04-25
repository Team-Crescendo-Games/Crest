import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getStage } from "@/lib/stage";

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

  // Key format: {stage}/attachments/{taskId}/{timestamp}-{sanitized filename}
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `${getStage()}/attachments/${taskId}/${Date.now()}-${sanitized}`;

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
 * Generate a presigned GET URL for downloading/viewing a private S3 object.
 * Extracts the key from the stored public URL.
 */
export async function getPresignedDownloadUrl(fileUrl: string, expiresIn = 3600): Promise<string> {
  let key: string;
  if (process.env.S3_PUBLIC_URL && fileUrl.startsWith(process.env.S3_PUBLIC_URL)) {
    key = fileUrl.slice(process.env.S3_PUBLIC_URL.length + 1);
  } else {
    const match = fileUrl.match(/\.amazonaws\.com\/(.+)$/);
    key = match?.[1] ?? fileUrl;
  }

  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn });
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

/**
 * Delete all objects under a given key prefix.
 *
 * Uses paginated ListObjectsV2 + batched DeleteObjects (max 1000 per call).
 * Returns the number of objects deleted. Errors bubble up — callers should
 * catch and decide whether to fail loudly or just log.
 *
 * WARNING: prefix must be specific enough that you can't accidentally nuke
 * unrelated data (e.g. always include a user ID or task ID).
 */
export async function deleteS3Prefix(prefix: string): Promise<number> {
  if (!prefix || prefix === "/" || prefix.length < 3) {
    throw new Error(`Refusing to delete suspiciously broad prefix: "${prefix}"`);
  }

  let totalDeleted = 0;
  let continuationToken: string | undefined;

  do {
    const listed = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );

    const objects = listed.Contents ?? [];
    if (objects.length > 0) {
      await s3.send(
        new DeleteObjectsCommand({
          Bucket: BUCKET,
          Delete: {
            Objects: objects
              .filter((o): o is { Key: string } => !!o.Key)
              .map((o) => ({ Key: o.Key })),
            Quiet: true,
          },
        }),
      );
      totalDeleted += objects.length;
    }

    continuationToken = listed.IsTruncated
      ? listed.NextContinuationToken
      : undefined;
  } while (continuationToken);

  return totalDeleted;
}

export { MAX_FILE_SIZE, ALLOWED_MIME_TYPES };
