import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteS3Object } from "@/lib/s3";

/**
 * DELETE /api/attachments/[attachmentId]
 * Deletes the attachment from S3 and the database.
 */
export async function DELETE(
  request: Request,
  ctx: RouteContext<"/api/attachments/[attachmentId]">
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { attachmentId } = await ctx.params;

    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: {
        task: { include: { board: { select: { workspaceId: true } } } },
      },
    });

    if (!attachment) {
      return NextResponse.json(
        { error: "Attachment not found" },
        { status: 404 }
      );
    }

    // Verify membership
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: session.user.id,
          workspaceId: attachment.task.board.workspaceId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Not a member" }, { status: 403 });
    }

    // Delete from S3
    try {
      await deleteS3Object(attachment.fileUrl);
    } catch {
      // Log but don't fail — the DB record should still be cleaned up
      console.error("Failed to delete S3 object:", attachment.fileUrl);
    }

    // Delete from database
    await prisma.attachment.delete({ where: { id: attachmentId } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
