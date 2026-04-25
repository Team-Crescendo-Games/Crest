import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: process.env.S3_REGION ?? "us-east-1",
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
  },
  forcePathStyle: !!process.env.S3_ENDPOINT,
});

const BUCKET = process.env.S3_BUCKET ?? "crest-attachments";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { mimeType, fileSize } = await request.json();

    if (!mimeType?.startsWith("image/")) {
      return NextResponse.json({ error: "Only images allowed" }, { status: 400 });
    }
    if (fileSize > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Max 5 MB" }, { status: 400 });
    }

    const ext = mimeType.split("/")[1] ?? "png";
    const key = `avatars/${session.user.id}/${Date.now()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: mimeType,
      ContentLength: fileSize,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

    const publicUrl = process.env.S3_PUBLIC_URL
      ? `${process.env.S3_PUBLIC_URL}/${key}`
      : `https://${BUCKET}.s3.${process.env.S3_REGION ?? "us-east-1"}.amazonaws.com/${key}`;

    return NextResponse.json({ uploadUrl, publicUrl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
