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

// ─── Load paginated tasks for any column ────────────────────────────────────

export async function loadColumnTasks(
  boardId: string,
  workspaceId: string,
  status: string,
  offset: number,
  limit: number,
  filters?: {
    q?: string;
    priorities?: string[];
    tagFilters?: string[];
    assigneeFilters?: string[];
    /** Scope to a specific sprint instead of a board */
    sprintId?: string;
    /** Scope to tasks assigned to a specific user (workspace-wide) */
    assigneeUserId?: string;
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

  // Build the where-clause based on the scoping mode
  const taskWhere: Record<string, unknown> = {
    status: status as TaskStatus,
  };

  if (filters?.sprintId) {
    // Sprint-scoped: tasks belonging to a specific sprint
    taskWhere.sprints = { some: { id: filters.sprintId } };
  } else if (filters?.assigneeUserId) {
    // Assignee-scoped: tasks assigned to a user within the workspace
    taskWhere.assignees = { some: { id: filters.assigneeUserId } };
    taskWhere.board = { workspaceId };
  } else {
    // Board-scoped (default)
    taskWhere.boardId = boardId;
  }

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

  // Only apply assignee filters when NOT in assignee-scoped mode
  if (!filters?.assigneeUserId && filters?.assigneeFilters && filters.assigneeFilters.length > 0) {
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
      board: { select: { id: true, name: true } },
      subtasks: { select: { id: true, status: true } },
      _count: { select: { comments: true } },
    },
  });

  return tasks.map((t) => ({ ...t, boardId: t.board.id, commentCount: t._count.comments, subtaskIds: t.subtasks.map((s) => s.id), subtaskTotal: t.subtasks.length, subtaskCompleted: t.subtasks.filter((s) => s.status === "COMPLETED").length }));
}

/** @deprecated Use loadColumnTasks instead */
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
  return loadColumnTasks(boardId, workspaceId, "COMPLETED", offset, limit, filters);
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

    const newPoints = points ? parseInt(points) || null : null;
    if (newPoints !== oldTask.points) {
      await logActivity(taskId, session.user.id, "EDITED", {
        field: "points",
        oldValue: oldTask.points != null ? String(oldTask.points) : null,
        newValue: newPoints != null ? String(newPoints) : null,
      });
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

// ─── Set parent (cross-board, for sprint flow view) ─────────────────────────

export async function setTaskParent(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const childId = formData.get("childId") as string;
  const parentId = formData.get("parentId") as string | null;
  const workspaceId = formData.get("workspaceId") as string;

  if (!childId || !workspaceId) return { error: "Invalid request" };

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
    await prisma.task.update({
      where: { id: childId },
      data: { parentTaskId: null },
    });
    revalidatePath(`/dashboard/workspaces/${workspaceId}`);
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
    return { error: "This task already has a parent. Remove the existing parent first." };
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

  await prisma.task.update({
    where: { id: childId },
    data: { parentTaskId: parentId },
  });

  revalidatePath(`/dashboard/workspaces/${workspaceId}`);
  return { success: true };
}

// ─── Flow graph (full dependency tree) ──────────────────────────────────────

/**
 * Fetch the full dependency graph for a task, following parent/subtask edges
 * recursively across the entire workspace (not limited to a sprint).
 */
export async function getFlowGraphTasks(
  rootTaskId: string,
  workspaceId: string,
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const membership = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: session.user.id, workspaceId } },
  });
  if (!membership) throw new Error("Not a member");

  const taskSelect = {
    id: true,
    title: true,
    description: true,
    status: true,
    priority: true,
    boardId: true,
    parentTaskId: true,
    board: { select: { id: true, name: true } },
    assignees: { select: { id: true, name: true } },
    tags: { select: { name: true, color: true } },
    subtasks: { select: { id: true } },
  } as const;

  // BFS: fetch connected tasks in batches
  const visited = new Set<string>();
  const queue = [rootTaskId];
  const results: {
    id: string;
    title: string;
    description: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    boardId: string;
    parentTaskId: string | null;
    board: { id: string; name: string };
    assignees: { id: string; name: string | null }[];
    tags: { name: string; color: string | null }[];
    subtasks: { id: string }[];
  }[] = [];

  while (queue.length > 0) {
    // Collect up to 50 unvisited IDs per batch
    const batch: string[] = [];
    while (queue.length > 0 && batch.length < 50) {
      const id = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      batch.push(id);
    }
    if (batch.length === 0) continue;

    const tasks = await prisma.task.findMany({
      where: {
        id: { in: batch },
        board: { workspaceId },
      },
      select: taskSelect,
    });

    for (const task of tasks) {
      results.push(task);

      // Queue parent
      if (task.parentTaskId && !visited.has(task.parentTaskId)) {
        queue.push(task.parentTaskId);
      }

      // Queue subtasks
      for (const sub of task.subtasks) {
        if (!visited.has(sub.id)) {
          queue.push(sub.id);
        }
      }
    }
  }

  return results.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    boardId: t.boardId,
    parentTaskId: t.parentTaskId,
    board: t.board,
    assignees: t.assignees,
    tags: t.tags,
    subtaskIds: t.subtasks.map((s) => s.id),
  }));
}

// ─── Search workspace tasks (for flow view "add task" prompt) ───────────────

/**
 * Search tasks in a workspace by title. Returns a lightweight list for the
 * flow-view search modal. Only runs when the caller provides a non-empty query
 * to avoid fetching the entire workspace task set.
 */
export async function searchWorkspaceTasks(
  workspaceId: string,
  query: string,
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  if (!query || query.trim().length === 0) return [];

  const membership = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: session.user.id, workspaceId } },
  });
  if (!membership) throw new Error("Not a member");

  const tasks = await prisma.task.findMany({
    where: {
      board: { workspaceId },
      title: { contains: query.trim(), mode: "insensitive" },
    },
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      boardId: true,
      parentTaskId: true,
      board: { select: { id: true, name: true } },
    },
    orderBy: { title: "asc" },
    take: 20,
  });

  return tasks;
}

// ─── Dashboard: load paginated tasks assigned to the current user ───────────

export async function loadMyColumnTasks(
  status: string,
  offset: number,
  limit: number,
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const tasks = await prisma.task.findMany({
    where: {
      status: status as TaskStatus,
      assignees: { some: { id: session.user.id } },
    },
    orderBy: { createdAt: "desc" },
    skip: offset,
    take: limit,
    include: {
      assignees: { select: { id: true, name: true, image: true } },
      tags: { select: { name: true, color: true } },
      board: { select: { id: true, name: true, workspaceId: true } },
      subtasks: { select: { id: true, status: true } },
      _count: { select: { comments: true } },
    },
  });

  return tasks.map((t) => ({
    ...t,
    boardId: t.board.id,
    workspaceId: t.board.workspaceId,
    commentCount: t._count.comments,
    subtaskIds: t.subtasks.map((s) => s.id),
    subtaskTotal: t.subtasks.length,
    subtaskCompleted: t.subtasks.filter((s) => s.status === "COMPLETED").length,
  }));
}
