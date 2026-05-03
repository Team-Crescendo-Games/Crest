"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidateTask } from "@/lib/actions/revalidation-helpers";
import { requireTaskMembership, logActivity } from "./helpers";
import { parseFormData } from "@/lib/validations/helpers";
import { addCommentSchema, deleteCommentSchema } from "@/lib/validations/task";

// ─── Comments ───────────────────────────────────────────────────────────────

export async function addComment(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const parsed = parseFormData(addCommentSchema, formData);
  if (!parsed.success) return { error: parsed.error };
  const { taskId, text } = parsed.data;

  let info;
  try {
    info = await requireTaskMembership(session.user.id, taskId);
  } catch {
    return { error: "Not authorized" };
  }

  await prisma.comment.create({
    data: {
      text: text.trim(),
      taskId,
      userId: session.user.id,
    },
  });

  await logActivity(taskId, session.user.id, "COMMENTED");

  revalidateTask(info.workspaceId, info.task.boardId, taskId);
  return { success: true };
}

export async function deleteComment(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const parsed = parseFormData(deleteCommentSchema, formData);
  if (!parsed.success) return { error: parsed.error };
  const { commentId } = parsed.data;

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: { task: { include: { board: { select: { workspaceId: true, id: true } } } } },
  });

  if (!comment) return { error: "Comment not found" };

  // Only the comment author can delete
  if (comment.userId !== session.user.id) {
    return { error: "You can only delete your own comments" };
  }

  await prisma.comment.delete({ where: { id: commentId } });

  revalidateTask(
    comment.task.board.workspaceId,
    comment.task.board.id,
    comment.taskId
  );
  return { success: true };
}
