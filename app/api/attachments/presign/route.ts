import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPresignedUploadUrl } from "@/lib/s3";

/**
 * POST /api/attachments/presign
 * Body: { taskId, fileName, mimeType, fileSize }
 * Returns: { uploadUrl, publicUrl, key }
 *
 * Client uploads directly to S3 using the uploadUrl,
 * then calls POST /api/attachments to save the metadata.
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId, fileName, mimeType, fileSize } = await request.json();

    if (!taskId || !fileName || !mimeType || !fileSize) {
      return NextResponse.json(
        { error: "taskId, fileName, mimeType, and fileSize are required" },
        { status: 400 }
      );
    }

    // Verify the user is a member of the task's workspace
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { board: { select: { workspaceId: true } } },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: session.user.id,
          workspaceId: task.board.workspaceId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Not a member" }, { status: 403 });
    }

    const { uploadUrl, publicUrl, key } = await getPresignedUploadUrl({
      taskId,
      fileName,
      mimeType,
      fileSize,
    });

    return NextResponse.json({ uploadUrl, publicUrl, key });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
