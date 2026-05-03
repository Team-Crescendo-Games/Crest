"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidateTask } from "@/lib/actions/revalidation-helpers";
import { requireTaskMembership } from "./helpers";
import { parseFormData } from "@/lib/validations/helpers";
import { addSubtaskSchema, removeSubtaskSchema } from "@/lib/validations/task";

// ─── Subtasks ───────────────────────────────────────────────────────────────

export async function addSubtask(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const parsed = parseFormData(addSubtaskSchema, formData);
  if (!parsed.success) return { error: parsed.error };
  const { parentTaskId, subtaskId } = parsed.data;

  if (parentTaskId === subtaskId)
    return { error: "A task cannot be its own subtask" };

  let info;
  try {
    info = await requireTaskMembership(session.user.id, parentTaskId);
  } catch {
    return { error: "Not authorized" };
  }

  // Verify the subtask exists and belongs to the same board
  const subtask = await prisma.task.findUnique({
    where: { id: subtaskId },
    select: { id: true, boardId: true, parentTaskId: true },
  });

  if (!subtask || subtask.boardId !== info.task.boardId) {
    return { error: "Subtask must be on the same board" };
  }

  if (subtask.parentTaskId) {
    // Create a notification for the user so they see this in their feed
    await prisma.notification.create({
      data: {
        type: "TASK_UPDATED",
        message: `Could not add subtask: the task is already a subtask of another task.`,
        userId: session.user.id,
        taskId: parentTaskId,
      },
    });
    return { error: "This task is already a subtask of another task" };
  }

  // Prevent circular references: the subtask must not be an ancestor of the parent
  let current: string | null = parentTaskId;
  while (current) {
    if (current === subtaskId) {
      return { error: "Circular subtask reference detected" };
    }
    const ancestor: { parentTaskId: string | null } | null =
      await prisma.task.findUnique({
        where: { id: current },
        select: { parentTaskId: true },
      });
    current = ancestor?.parentTaskId ?? null;
  }

  try {
    await prisma.task.update({
      where: { id: subtaskId },
      data: { parentTaskId },
    });
  } catch (err) {
    console.error(err);
    return { error: "An unexpected error occurred" };
  }

  revalidateTask(info.workspaceId, info.task.boardId, parentTaskId);
  return { success: true };
}

export async function removeSubtask(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const parsed = parseFormData(removeSubtaskSchema, formData);
  if (!parsed.success) return { error: parsed.error };
  const { parentTaskId, subtaskId } = parsed.data;

  let info;
  try {
    info = await requireTaskMembership(session.user.id, parentTaskId);
  } catch {
    return { error: "Not authorized" };
  }

  // Verify the subtask actually belongs to this parent
  const subtask = await prisma.task.findUnique({
    where: { id: subtaskId },
    select: { parentTaskId: true },
  });

  if (!subtask || subtask.parentTaskId !== parentTaskId) {
    return { error: "This task is not a subtask of the specified parent" };
  }

  try {
    await prisma.task.update({
      where: { id: subtaskId },
      data: { parentTaskId: null },
    });
  } catch (err) {
    console.error(err);
    return { error: "An unexpected error occurred" };
  }

  revalidateTask(info.workspaceId, info.task.boardId, parentTaskId);
  return { success: true };
}

/** Fetch subtasks for a given parent task (on-demand). */
export async function getSubtasks(taskId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const subtasks = await prisma.task.findMany({
    where: { parentTaskId: taskId },
    select: { id: true, title: true, status: true },
    orderBy: { createdAt: "asc" },
  });

  return subtasks;
}

/** Fetch tasks on the same board that can be added as subtasks. */
export async function getAvailableSubtasks(
  boardId: string,
  parentTaskId: string,
  query: string,
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const tasks = await prisma.task.findMany({
    where: {
      boardId,
      id: { not: parentTaskId },
      parentTaskId: null, // not already a subtask
      title: query ? { contains: query, mode: "insensitive" } : undefined,
      // Exclude tasks that are ancestors of the parent (prevent cycles)
      NOT: { subtasks: { some: { id: parentTaskId } } },
    },
    select: {
      id: true,
      title: true,
      status: true,
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return tasks;
}
