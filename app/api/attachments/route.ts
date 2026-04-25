import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/attachments
 * Body: { taskId, fileName, fileUrl, fileSize, mimeType }
 * Called after the client successfully uploads to S3.
 * Saves the attachment metadata to the database.
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId, fileName, fileUrl, fileSize, mimeType } =
      await request.json();

    if (!taskId || !fileName || !fileUrl || !fileSize || !mimeType) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Verify membership
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

    const attachment = await prisma.attachment.create({
      data: {
        fileName,
        fileUrl,
        fileSize,
        mimeType,
        taskId,
        uploadedById: session.user.id,
      },
    });

    return NextResponse.json({ attachment }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
