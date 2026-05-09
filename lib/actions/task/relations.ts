"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { revalidateTask } from "@/lib/actions/revalidation-helpers";
import { requireTaskMembership, logActivity } from "./helpers";
import { parseFormData } from "@/lib/validations/helpers";
import {
  updateTaskAssigneesSchema,
  updateTaskTagsSchema,
  updateTaskSprintsSchema,
  setTaskParentSchema,
} from "@/lib/validations/task";

// ─── Update assignees ───────────────────────────────────────────────────────

export async function updateTaskAssignees(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const parsed = parseFormData(updateTaskAssigneesSchema, formData, ["assigneeIds"]);
  if (!parsed.success) return { error: parsed.error };
  const { taskId, assigneeIds } = parsed.data;

  let info;
  try {
    info = await requireTaskMembership(session.user.id, taskId);
  } catch {
    return { error: "Not authorized" };
  }

  const oldTask = await prisma.task.findUnique({
    where: { id: taskId },
    select: { assignees: { select: { id: true } } },
  });
  const oldAssigneeIds = oldTask?.assignees.map((a) => a.id) ?? [];

  try {
    await prisma.task.update({
      where: { id: taskId },
      data: { assignees: { set: assigneeIds.map((id) => ({ id })) } },
    });
  } catch (err) {
    console.error(err);
    return { error: "An unexpected error occurred" };
  }

  const added = assigneeIds.filter((id) => !oldAssigneeIds.includes(id));
  const removed = oldAssigneeIds.filter((id) => !assigneeIds.includes(id));
  for (const id of added) {
    await logActivity(taskId, session.user.id, "ASSIGNED", { newValue: id });
  }
  for (const id of removed) {
    await logActivity(taskId, session.user.id, "UNASSIGNED", { oldValue: id });
  }

  revalidateTask(info.workspaceId, info.task.boardId, taskId);
  return { success: true };
}

// ─── Update tags ────────────────────────────────────────────────────────────

export async function updateTaskTags(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const parsed = parseFormData(updateTaskTagsSchema, formData, ["tagIds"]);
  if (!parsed.success) return { error: parsed.error };
  const { taskId, tagIds } = parsed.data;

  let info;
  try {
    info = await requireTaskMembership(session.user.id, taskId);
  } catch {
    return { error: "Not authorized" };
  }

  // Validate tags belong to the workspace
  if (tagIds.length > 0) {
    const validCount = await prisma.tag.count({
      where: { id: { in: tagIds }, workspaceId: info.workspaceId },
    });
    if (validCount !== tagIds.length) {
      return { error: "Invalid tag selection" };
    }
  }

  try {
    await prisma.task.update({
      where: { id: taskId },
      data: { tags: { set: tagIds.map((id) => ({ id })) } },
    });
  } catch (err) {
    console.error(err);
    return { error: "An unexpected error occurred" };
  }

  await logActivity(taskId, session.user.id, "EDITED", { field: "tags" });

  revalidateTask(info.workspaceId, info.task.boardId, taskId);
  return { success: true };
}

// ─── Update sprints ─────────────────────────────────────────────────────────

export async function updateTaskSprints(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const parsed = parseFormData(updateTaskSprintsSchema, formData, ["sprintIds"]);
  if (!parsed.success) return { error: parsed.error };
  const { taskId, sprintIds, workspaceId } = parsed.data;

  let info;
  try {
    info = await requireTaskMembership(session.user.id, taskId);
  } catch {
    return { error: "Not authorized" };
  }

  // Validate all sprints belong to the same workspace
  if (sprintIds.length > 0) {
    const validCount = await prisma.sprint.count({
      where: { id: { in: sprintIds }, workspaceId: info.workspaceId },
    });
    if (validCount !== sprintIds.length) {
      return { error: "Invalid sprint selection" };
    }
  }

  // Get old sprints for activity logging
  const oldTask = await prisma.task.findUnique({
    where: { id: taskId },
    select: { sprints: { select: { id: true } } },
  });
  const oldSprintIds = oldTask?.sprints.map((s) => s.id) ?? [];

  try {
    await prisma.task.update({
      where: { id: taskId },
      data: {
        sprints: { set: sprintIds.map((id) => ({ id })) },
      },
    });
  } catch (err) {
    console.error(err);
    return { error: "An unexpected error occurred" };
  }

  // Log added/removed sprints
  const added = sprintIds.filter((id) => !oldSprintIds.includes(id));
  const removed = oldSprintIds.filter((id) => !sprintIds.includes(id));
  for (const id of added) {
    await logActivity(taskId, session.user.id, "MOVED_TO_SPRINT", {
      newValue: id,
    });
  }
  for (const id of removed) {
    await logActivity(taskId, session.user.id, "REMOVED_FROM_SPRINT", {
      oldValue: id,
    });
  }

  revalidateTask(info.workspaceId, info.task.boardId, taskId);
  // Also revalidate affected sprint pages
  for (const id of [...added, ...removed]) {
    revalidatePath(`/w/${workspaceId}/s/${id}`);
  }

  return { success: true };
}

// ─── Set parent (cross-board, for sprint flow view) ─────────────────────────

export async function setTaskParent(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const parsed = parseFormData(setTaskParentSchema, formData);
  if (!parsed.success) return { error: parsed.error };
  const { childId, parentId, workspaceId } = parsed.data;

  // Verify membership
  const membership = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: session.user.id, workspaceId } },
  });
  if (!membership) return { error: "Not authorized" };

  // Verify child task belongs to this workspace
  const child = await prisma.task.findUnique({
    where: { id: childId },
    include: { board: { select: { workspaceId: true, id: true } } },
  });
  if (!child || child.board.workspaceId !== workspaceId) {
    return { error: "Task not found in workspace" };
  }

  // If removing parent (parentId is null or empty)
  if (!parentId) {
    try {
      await prisma.task.update({
        where: { id: childId },
        data: { parentTaskId: null },
      });
    } catch (err) {
      console.error(err);
      return { error: "An unexpected error occurred" };
    }
    revalidatePath(`/w/${workspaceId}`);
    return { success: true };
  }

  if (childId === parentId) return { error: "A task cannot be its own parent" };

  // Verify parent task belongs to this workspace
  const parent = await prisma.task.findUnique({
    where: { id: parentId },
    include: { board: { select: { workspaceId: true, id: true } } },
  });
  if (!parent || parent.board.workspaceId !== workspaceId) {
    return { error: "Parent task not found in workspace" };
  }

  // Check if child already has a parent
  if (child.parentTaskId && child.parentTaskId !== parentId) {
    return {
      error: "This task already has a parent. Remove the existing parent first.",
    };
  }

  // Prevent circular references: walk up from parentId, ensure we never hit childId
  const visited = new Set<string>();
  let current: string | null = parentId;
  while (current) {
    if (current === childId) {
      return { error: "Circular reference detected" };
    }
    if (visited.has(current)) break; // already visited, stop
    visited.add(current);
    const ancestor: { parentTaskId: string | null } | null = await prisma.task.findUnique({
      where: { id: current },
      select: { parentTaskId: true },
    });
    current = ancestor?.parentTaskId ?? null;
  }

  try {
    await prisma.task.update({
      where: { id: childId },
      data: { parentTaskId: parentId },
    });
  } catch (err) {
    console.error(err);
    return { error: "An unexpected error occurred" };
  }

  revalidatePath(`/w/${workspaceId}`);
  return { success: true };
}
