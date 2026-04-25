"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { TaskStatus, TaskPriority, ActivityType } from "@/prisma/generated/prisma/enums";

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

async function logActivity(
  taskId: string,
  userId: string,
  type: ActivityType,
  opts?: { field?: string; oldValue?: string | null; newValue?: string | null },
) {
  await prisma.activity.create({
    data: {
      taskId,
      userId,
      type,
      field: opts?.field ?? null,
      oldValue: opts?.oldValue ?? null,
      newValue: opts?.newValue ?? null,
    },
  });
}

// ─── Load completed tasks (pagination) ──────────────────────────────────────

export async function loadCompletedTasks(
  boardId: string,
  workspaceId: string,
  offset: number,
  limit: number,
  filters?: {
    q?: string;
    priorities?: string[];
    tagFilters?: string[];
    assigneeFilters?: string[];
  },
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: { userId: session.user.id, workspaceId },
    },
  });
  if (!membership) throw new Error("Not a member");

  // Build the same filter where-clause the board page uses
  const taskWhere: Record<string, unknown> = {
    boardId,
    status: "COMPLETED" as TaskStatus,
  };

  if (filters?.q) {
    taskWhere.OR = [
      { title: { contains: filters.q, mode: "insensitive" } },
      { description: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  if (filters?.priorities && filters.priorities.length === 1) {
    taskWhere.priority = filters.priorities[0] as TaskPriority;
  } else if (filters?.priorities && filters.priorities.length > 1) {
    taskWhere.priority = { in: filters.priorities as TaskPriority[] };
  }

  if (filters?.tagFilters && filters.tagFilters.length === 1) {
    taskWhere.tags = { some: { name: filters.tagFilters[0] } };
  } else if (filters?.tagFilters && filters.tagFilters.length > 1) {
    taskWhere.AND = filters.tagFilters.map((name) => ({
      tags: { some: { name } },
    }));
  }

  if (filters?.assigneeFilters && filters.assigneeFilters.length > 0) {
    const hasUnassigned = filters.assigneeFilters.includes("unassigned");
    const userIds = filters.assigneeFilters.filter((v) => v !== "unassigned");

    if (hasUnassigned && userIds.length > 0) {
      taskWhere.OR = [
        ...(taskWhere.OR ? (taskWhere.OR as unknown[]) : []),
        { assignees: { none: {} } },
        { assignees: { some: { id: { in: userIds } } } },
      ];
    } else if (hasUnassigned) {
      taskWhere.assignees = { none: {} };
    } else {
      taskWhere.assignees = { some: { id: { in: userIds } } };
    }
  }

  const tasks = await prisma.task.findMany({
    where: taskWhere,
    orderBy: { createdAt: "desc" },
    skip: offset,
    take: limit,
    include: {
      author: { select: { name: true } },
      assignees: { select: { id: true, name: true, image: true } },
      tags: { select: { name: true, color: true } },
      subtasks: { select: { id: true } },
      _count: { select: { comments: true } },
    },
  });

  return tasks.map((t) => ({ ...t, commentCount: t._count.comments, subtaskIds: t.subtasks.map((s) => s.id) }));
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
  const tagIds = formData.getAll("tagIds") as string[];
  const sprintId = (formData.get("sprintId") as string) || null;

  if (!boardId || !title?.trim()) {
    return { error: "Task title is required" };
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

  // If a sprint was specified, verify it belongs to the same workspace.
  if (sprintId) {
    const sprint = await prisma.sprint.findUnique({
      where: { id: sprintId },
      select: { workspaceId: true },
    });
    if (!sprint || sprint.workspaceId !== board.workspaceId) {
      return { error: "Invalid sprint" };
    }
  }

  // Validate tags belong to the workspace
  if (tagIds.length > 0) {
    const validTagCount = await prisma.tag.count({
      where: { id: { in: tagIds }, workspaceId: board.workspaceId },
    });
    if (validTagCount !== tagIds.length) {
      return { error: "Invalid tag selection" };
    }
  }

  const task = await prisma.task.create({
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
      tags: tagIds.length > 0
        ? { connect: tagIds.map((id) => ({ id })) }
        : undefined,
      sprints: sprintId ? { connect: { id: sprintId } } : undefined,
    },
  });

  revalidatePath(`/dashboard/workspaces/${workspaceId}/boards/${boardId}`);
  revalidatePath(`/dashboard/workspaces/${workspaceId}/boards`);
  if (sprintId) {
    revalidatePath(`/dashboard/workspaces/${workspaceId}/sprints/${sprintId}`);
  }

  await logActivity(task.id, session.user.id, "CREATED");

  return { success: true, newTaskId: task.id };
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
  const tagIds = formData.getAll("tagIds") as string[];
  const newBoardId = formData.get("boardId") as string | null;
  const sprintIds = formData.getAll("sprintIds") as string[];
  const workspaceId = formData.get("workspaceId") as string;

  if (!taskId || !title?.trim()) return { error: "Task title is required" };

  let info;
  try {
    info = await requireTaskMembership(session.user.id, taskId);
  } catch {
    return { error: "Not authorized" };
  }

  // Validate tags all belong to this task's workspace to prevent cross-workspace linking.
  if (tagIds.length > 0) {
    const validTagCount = await prisma.tag.count({
      where: { id: { in: tagIds }, workspaceId: info.workspaceId },
    });
    if (validTagCount !== tagIds.length) {
      return { error: "Invalid tag selection" };
    }
  }

  // Validate board belongs to the same workspace
  let boardId = info.task.boardId;
  if (newBoardId && newBoardId !== boardId) {
    const targetBoard = await prisma.board.findUnique({
      where: { id: newBoardId },
      select: { workspaceId: true },
    });
    if (!targetBoard || targetBoard.workspaceId !== info.workspaceId) {
      return { error: "Target board not found in this workspace" };
    }
    boardId = newBoardId;
  }

  // Validate sprints belong to the same workspace
  if (sprintIds.length > 0) {
    const validSprintCount = await prisma.sprint.count({
      where: { id: { in: sprintIds }, workspaceId: info.workspaceId },
    });
    if (validSprintCount !== sprintIds.length) {
      return { error: "Invalid sprint selection" };
    }
  }

  // Fetch old values for activity logging
  const oldTask = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      assignees: { select: { id: true } },
      sprints: { select: { id: true } },
    },
  });

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
      boardId,
      assignees: { set: assigneeIds.map((id) => ({ id })) },
      tags: { set: tagIds.map((id) => ({ id })) },
      sprints: { set: sprintIds.map((id) => ({ id })) },
    },
  });

  // Log activities for changed fields
  if (oldTask) {
    const newStatus = VALID_STATUSES.includes(status) ? status : oldTask.status;
    if (newStatus !== oldTask.status) {
      await logActivity(taskId, session.user.id, "STATUS_CHANGED", {
        field: "status",
        oldValue: oldTask.status,
        newValue: newStatus,
      });
    }

    const newPriority = VALID_PRIORITIES.includes(priority) ? priority : oldTask.priority;
    if (newPriority !== oldTask.priority) {
      await logActivity(taskId, session.user.id, "PRIORITY_CHANGED", {
        field: "priority",
        oldValue: oldTask.priority,
        newValue: newPriority,
      });
    }

    const oldAssigneeIds = oldTask.assignees.map((a) => a.id).sort();
    const newAssigneeIds = [...assigneeIds].sort();
    const added = newAssigneeIds.filter((id) => !oldAssigneeIds.includes(id));
    const removed = oldAssigneeIds.filter((id) => !newAssigneeIds.includes(id));
    for (const id of added) {
      await logActivity(taskId, session.user.id, "ASSIGNED", { newValue: id });
    }
    for (const id of removed) {
      await logActivity(taskId, session.user.id, "UNASSIGNED", { oldValue: id });
    }

    if (boardId !== info.task.boardId) {
      await logActivity(taskId, session.user.id, "EDITED", {
        field: "board",
        oldValue: info.task.boardId,
        newValue: boardId,
      });
    }

    const oldSprintIds = oldTask.sprints.map((s) => s.id).sort();
    const newSprintIds = [...sprintIds].sort();
    const addedSprints = newSprintIds.filter((id) => !oldSprintIds.includes(id));
    const removedSprints = oldSprintIds.filter((id) => !newSprintIds.includes(id));
    for (const id of addedSprints) {
      await logActivity(taskId, session.user.id, "MOVED_TO_SPRINT", { newValue: id });
    }
    for (const id of removedSprints) {
      await logActivity(taskId, session.user.id, "REMOVED_FROM_SPRINT", { oldValue: id });
    }

    if (title.trim() !== oldTask.title || (description?.trim() || null) !== oldTask.description) {
      await logActivity(taskId, session.user.id, "EDITED");
    }
  }

  // Revalidate old and new board paths
  revalidateTask(info.workspaceId, info.task.boardId, taskId);
  if (boardId !== info.task.boardId) {
    revalidateTask(info.workspaceId, boardId, taskId);
    revalidatePath(`/dashboard/workspaces/${info.workspaceId}/boards`);
  }

  // Return the new boardId so the client can redirect if the board changed
  return { success: true, newBoardId: boardId !== info.task.boardId ? boardId : undefined };
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

  const oldStatus = info.task.status;

  await prisma.task.update({
    where: { id: taskId },
    data: { status },
  });

  if (oldStatus !== status) {
    await logActivity(taskId, session.user.id, "STATUS_CHANGED", {
      field: "status",
      oldValue: oldStatus,
      newValue: status,
    });
  }

  revalidatePath(`/dashboard/workspaces/${workspaceId}/boards/${info.task.boardId}`);
  revalidatePath(`/dashboard/workspaces/${workspaceId}/boards`);
  return { success: true };
}

// ─── Update priority ────────────────────────────────────────────────────────

export async function updateTaskPriority(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const taskId = formData.get("taskId") as string;
  const workspaceId = formData.get("workspaceId") as string;
  const priority = formData.get("priority") as TaskPriority;

  if (!taskId || !priority || !VALID_PRIORITIES.includes(priority)) {
    return { error: "Invalid request" };
  }

  let info;
  try {
    info = await requireTaskMembership(session.user.id, taskId);
  } catch {
    return { error: "Not authorized" };
  }

  const oldPriority = info.task.priority;

  await prisma.task.update({
    where: { id: taskId },
    data: { priority },
  });

  if (oldPriority !== priority) {
    await logActivity(taskId, session.user.id, "PRIORITY_CHANGED", {
      field: "priority",
      oldValue: oldPriority,
      newValue: priority,
    });
  }

  revalidatePath(`/dashboard/workspaces/${workspaceId}/boards/${info.task.boardId}`);
  revalidatePath(`/dashboard/workspaces/${workspaceId}/boards`);
  revalidateTask(info.workspaceId, info.task.boardId, taskId);
  return { success: true };
}

// ─── Delete ─────────────────────────────────────────────────────────────────

export async function moveTaskToBoard(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const taskId = formData.get("taskId") as string;
  const newBoardId = formData.get("boardId") as string;
  const workspaceId = formData.get("workspaceId") as string;

  if (!taskId || !newBoardId) return { error: "Invalid request" };

  let info;
  try {
    info = await requireTaskMembership(session.user.id, taskId);
  } catch {
    return { error: "Not authorized" };
  }

  if (info.task.boardId === newBoardId) return { success: true };

  // Verify the target board belongs to the same workspace
  const targetBoard = await prisma.board.findUnique({
    where: { id: newBoardId },
    select: { workspaceId: true },
  });
  if (!targetBoard || targetBoard.workspaceId !== info.workspaceId) {
    return { error: "Target board not found in this workspace" };
  }

  const oldBoardId = info.task.boardId;

  await prisma.task.update({
    where: { id: taskId },
    data: { boardId: newBoardId },
  });

  await logActivity(taskId, session.user.id, "EDITED", {
    field: "board",
    oldValue: oldBoardId,
    newValue: newBoardId,
  });

  revalidatePath(`/dashboard/workspaces/${workspaceId}/boards/${oldBoardId}`);
  revalidatePath(`/dashboard/workspaces/${workspaceId}/boards/${newBoardId}`);
  revalidatePath(`/dashboard/workspaces/${workspaceId}/boards`);

  return { success: true, newBoardId };
}

export async function updateTaskSprints(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const taskId = formData.get("taskId") as string;
  const sprintIds = formData.getAll("sprintIds") as string[];
  const workspaceId = formData.get("workspaceId") as string;

  if (!taskId) return { error: "Invalid request" };

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

  await prisma.task.update({
    where: { id: taskId },
    data: {
      sprints: { set: sprintIds.map((id) => ({ id })) },
    },
  });

  // Log added/removed sprints
  const added = sprintIds.filter((id) => !oldSprintIds.includes(id));
  const removed = oldSprintIds.filter((id) => !sprintIds.includes(id));
  for (const id of added) {
    await logActivity(taskId, session.user.id, "MOVED_TO_SPRINT", { newValue: id });
  }
  for (const id of removed) {
    await logActivity(taskId, session.user.id, "REMOVED_FROM_SPRINT", { oldValue: id });
  }

  revalidateTask(info.workspaceId, info.task.boardId, taskId);
  // Also revalidate affected sprint pages
  for (const id of [...added, ...removed]) {
    revalidatePath(`/dashboard/workspaces/${workspaceId}/sprints/${id}`);
  }

  return { success: true };
}

// ─── Update due date ────────────────────────────────────────────────────────

export async function updateTaskDueDate(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const taskId = formData.get("taskId") as string;
  const workspaceId = formData.get("workspaceId") as string;
  const dueDateStr = formData.get("dueDate") as string;

  if (!taskId) return { error: "Invalid request" };

  let info;
  try {
    info = await requireTaskMembership(session.user.id, taskId);
  } catch {
    return { error: "Not authorized" };
  }

  const dueDate = dueDateStr ? new Date(dueDateStr) : null;

  await prisma.task.update({
    where: { id: taskId },
    data: { dueDate },
  });

  await logActivity(taskId, session.user.id, "EDITED", {
    field: "dueDate",
    oldValue: info.task.dueDate?.toISOString() ?? null,
    newValue: dueDate?.toISOString() ?? null,
  });

  revalidateTask(info.workspaceId, info.task.boardId, taskId);
  return { success: true };
}

// ─── Update assignees ───────────────────────────────────────────────────────

export async function updateTaskAssignees(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const taskId = formData.get("taskId") as string;
  const workspaceId = formData.get("workspaceId") as string;
  const assigneeIds = formData.getAll("assigneeIds") as string[];

  if (!taskId) return { error: "Invalid request" };

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

  await prisma.task.update({
    where: { id: taskId },
    data: { assignees: { set: assigneeIds.map((id) => ({ id })) } },
  });

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
  if (!session?.user?.id) throw new Error("Unauthorized");

  const taskId = formData.get("taskId") as string;
  const workspaceId = formData.get("workspaceId") as string;
  const tagIds = formData.getAll("tagIds") as string[];

  if (!taskId) return { error: "Invalid request" };

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

  await prisma.task.update({
    where: { id: taskId },
    data: { tags: { set: tagIds.map((id) => ({ id })) } },
  });

  await logActivity(taskId, session.user.id, "EDITED", { field: "tags" });

  revalidateTask(info.workspaceId, info.task.boardId, taskId);
  return { success: true };
}

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

  await logActivity(taskId, session.user.id, "COMMENTED");

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

// ─── Subtasks ───────────────────────────────────────────────────────────────

export async function addSubtask(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const parentTaskId = formData.get("parentTaskId") as string;
  const subtaskId = formData.get("subtaskId") as string;

  if (!parentTaskId || !subtaskId) return { error: "Invalid request" };
  if (parentTaskId === subtaskId) return { error: "A task cannot be its own subtask" };

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
    return { error: "This task is already a subtask of another task" };
  }

  // Prevent circular references: the subtask must not be an ancestor of the parent
  let current: string | null = parentTaskId;
  while (current) {
    if (current === subtaskId) {
      return { error: "Circular subtask reference detected" };
    }
    const ancestor: { parentTaskId: string | null } | null = await prisma.task.findUnique({
      where: { id: current },
      select: { parentTaskId: true },
    });
    current = ancestor?.parentTaskId ?? null;
  }

  await prisma.task.update({
    where: { id: subtaskId },
    data: { parentTaskId },
  });

  revalidateTask(info.workspaceId, info.task.boardId, parentTaskId);
  return { success: true };
}

export async function removeSubtask(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const parentTaskId = formData.get("parentTaskId") as string;
  const subtaskId = formData.get("subtaskId") as string;

  if (!parentTaskId || !subtaskId) return { error: "Invalid request" };

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

  await prisma.task.update({
    where: { id: subtaskId },
    data: { parentTaskId: null },
  });

  revalidateTask(info.workspaceId, info.task.boardId, parentTaskId);
  return { success: true };
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
