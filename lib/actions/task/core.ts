"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { TaskStatus, TaskPriority } from "@/prisma/generated/prisma/enums";
import { PRIORITY_ORDER, type SortOption } from "@/lib/task-enums";
import { revalidateTask } from "@/lib/actions/revalidation-helpers";
import {
  requireTaskMembership,
  logActivity,
  buildOrderBy,
  VALID_STATUSES,
  VALID_PRIORITIES,
} from "./helpers";

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
    /** Sort options */
    sorts?: SortOption[];
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

  const orderBy = buildOrderBy(filters?.sorts);

  const tasks = await prisma.task.findMany({
    where: taskWhere,
    orderBy,
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

  // If sorting by priority, Prisma sorts alphabetically on the enum string.
  // We need to re-sort in memory using our custom priority order.
  const hasPrioritySort = filters?.sorts?.some((s) => s.field === "priority");
  if (hasPrioritySort) {
    const prioritySort = filters!.sorts!.find((s) => s.field === "priority")!;
    tasks.sort((a, b) => {
      const aOrder = PRIORITY_ORDER[a.priority] ?? 99;
      const bOrder = PRIORITY_ORDER[b.priority] ?? 99;
      return prioritySort.direction === "asc" ? aOrder - bOrder : bOrder - aOrder;
    });
  }

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

  revalidatePath(`/w/${workspaceId}/b/${boardId}`);
  revalidatePath(`/w/${workspaceId}/b`);
  if (sprintId) {
    revalidatePath(`/w/${workspaceId}/s/${sprintId}`);
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
    revalidatePath(`/w/${info.workspaceId}/b`);
  }

  // Return the new boardId so the client can redirect if the board changed
  return { success: true, newBoardId: boardId !== info.task.boardId ? boardId : undefined };
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

  revalidatePath(`/w/${info.workspaceId}/b/${info.task.boardId}`);
  revalidatePath(`/w/${info.workspaceId}/b`);
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

  revalidatePath(`/w/${workspaceId}/b/${info.task.boardId}`);
  revalidatePath(`/w/${workspaceId}/b`);
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

  revalidatePath(`/w/${workspaceId}/b/${info.task.boardId}`);
  revalidatePath(`/w/${workspaceId}/b`);
  revalidateTask(info.workspaceId, info.task.boardId, taskId);
  return { success: true };
}

// ─── Move to board ──────────────────────────────────────────────────────────

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

  revalidatePath(`/w/${workspaceId}/b/${oldBoardId}`);
  revalidatePath(`/w/${workspaceId}/b/${newBoardId}`);
  revalidatePath(`/w/${workspaceId}/b`);

  return { success: true, newBoardId };
}

// ─── Update due date ────────────────────────────────────────────────────────

export async function updateTaskDueDate(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const taskId = formData.get("taskId") as string;
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
