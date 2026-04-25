"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { TaskStatus, TaskPriority } from "@/prisma/generated/prisma/enums";

const VALID_STATUSES: TaskStatus[] = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "IN_REVIEW",
  "COMPLETED",
];

const VALID_PRIORITIES: TaskPriority[] = [
  "NONE",
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
];

async function requireTaskMembership(userId: string, taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { board: { select: { workspaceId: true, id: true } } },
  });
  if (!task) throw new Error("Task not found");

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId: task.board.workspaceId,
      },
    },
  });
  if (!membership) throw new Error("Not a member");

  return { task, workspaceId: task.board.workspaceId };
}

function revalidateTask(workspaceId: string, boardId: string, taskId: string) {
  revalidatePath(`/dashboard/workspaces/${workspaceId}/boards/${boardId}`);
  revalidatePath(`/dashboard/workspaces/${workspaceId}/boards/${boardId}/tasks/${taskId}`);
  revalidatePath(`/dashboard/workspaces/${workspaceId}/boards`);
}

// ─── Create ─────────────────────────────────────────────────────────────────

export async function createTask(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const boardId = formData.get("boardId") as string;
  const workspaceId = formData.get("workspaceId") as string;
  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || null;
  const status = (formData.get("status") as TaskStatus) || "NOT_STARTED";
  const priority = (formData.get("priority") as TaskPriority) || "NONE";
  const startDate = formData.get("startDate") as string;
  const dueDate = formData.get("dueDate") as string;
  const points = formData.get("points") as string;
  const assigneeIds = formData.getAll("assigneeIds") as string[];

  if (!boardId || !title?.trim()) {
    return { error: "Task title is required" };
  }

  if (!dueDate) {
    return { error: "Due date is required" };
  }

  if (!VALID_STATUSES.includes(status)) return { error: "Invalid status" };
  if (!VALID_PRIORITIES.includes(priority)) return { error: "Invalid priority" };

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { workspaceId: true },
  });
  if (!board) return { error: "Board not found" };

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: { userId: session.user.id, workspaceId: board.workspaceId },
    },
  });
  if (!membership) return { error: "Not a member" };

  await prisma.task.create({
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      status,
      priority,
      startDate: startDate ? new Date(startDate) : null,
      dueDate: dueDate ? new Date(dueDate) : null,
      points: points ? parseInt(points) || null : null,
      boardId,
      authorId: session.user.id,
      assignees: assigneeIds.length > 0
        ? { connect: assigneeIds.map((id) => ({ id })) }
        : undefined,
    },
  });

  revalidatePath(`/dashboard/workspaces/${workspaceId}/boards/${boardId}`);
  revalidatePath(`/dashboard/workspaces/${workspaceId}/boards`);
  return { success: true };
}

// ─── Update ─────────────────────────────────────────────────────────────────

export async function updateTask(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const taskId = formData.get("taskId") as string;
  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || null;
  const status = formData.get("status") as TaskStatus;
  const priority = formData.get("priority") as TaskPriority;
  const startDate = formData.get("startDate") as string;
  const dueDate = formData.get("dueDate") as string;
  const points = formData.get("points") as string;
  const assigneeIds = formData.getAll("assigneeIds") as string[];

  if (!taskId || !title?.trim()) return { error: "Task title is required" };

  let info;
  try {
    info = await requireTaskMembership(session.user.id, taskId);
  } catch {
    return { error: "Not authorized" };
  }

  await prisma.task.update({
    where: { id: taskId },
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      status: VALID_STATUSES.includes(status) ? status : undefined,
      priority: VALID_PRIORITIES.includes(priority) ? priority : undefined,
      startDate: startDate ? new Date(startDate) : null,
      dueDate: dueDate ? new Date(dueDate) : null,
      points: points ? parseInt(points) || null : null,
      assignees: { set: assigneeIds.map((id) => ({ id })) },
    },
  });

  revalidateTask(info.workspaceId, info.task.boardId, taskId);
  return { success: true };
}

// ─── Update status (drag-and-drop) ──────────────────────────────────────────

export async function updateTaskStatus(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const taskId = formData.get("taskId") as string;
  const workspaceId = formData.get("workspaceId") as string;
  const status = formData.get("status") as TaskStatus;

  if (!taskId || !status || !VALID_STATUSES.includes(status)) {
    return { error: "Invalid request" };
  }

  let info;
  try {
    info = await requireTaskMembership(session.user.id, taskId);
  } catch {
    return { error: "Not authorized" };
  }

  await prisma.task.update({
    where: { id: taskId },
    data: { status },
  });

  revalidatePath(`/dashboard/workspaces/${workspaceId}/boards/${info.task.boardId}`);
  revalidatePath(`/dashboard/workspaces/${workspaceId}/boards`);
  return { success: true };
}

// ─── Delete ─────────────────────────────────────────────────────────────────

export async function deleteTask(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const taskId = formData.get("taskId") as string;

  let info;
  try {
    info = await requireTaskMembership(session.user.id, taskId);
  } catch {
    return { error: "Not authorized" };
  }

  await prisma.task.delete({ where: { id: taskId } });

  revalidatePath(`/dashboard/workspaces/${info.workspaceId}/boards/${info.task.boardId}`);
  revalidatePath(`/dashboard/workspaces/${info.workspaceId}/boards`);
  return { success: true };
}

// ─── Comments ───────────────────────────────────────────────────────────────

export async function addComment(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const taskId = formData.get("taskId") as string;
  const text = formData.get("text") as string;

  if (!taskId || !text?.trim()) return { error: "Comment text is required" };

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

  revalidateTask(info.workspaceId, info.task.boardId, taskId);
  return { success: true };
}

export async function deleteComment(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const commentId = formData.get("commentId") as string;
  if (!commentId) return { error: "Invalid request" };

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
