"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TaskStatus, TaskPriority } from "@/prisma/generated/prisma/enums";
import { PRIORITY_ORDER, type SortOption } from "@/lib/task-enums";
import { buildOrderBy } from "./helpers";

// ─── Flow graph (full dependency tree) ──────────────────────────────────────

/**
 * Fetch the full dependency graph for a task, following parent/subtask edges
 * recursively across the entire workspace (not limited to a sprint).
 */
export async function getFlowGraphTasks(rootTaskId: string, workspaceId: string) {
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
export async function searchWorkspaceTasks(workspaceId: string, query: string) {
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

// ─── Workspace tasks: paginated list with filters/sorts ────────────────────

export interface WorkspaceTaskFilters {
  q?: string;
  priorities?: string[];
  tagFilters?: string[];
  assigneeFilters?: string[];
  boardIds?: string[];
  sprintIds?: string[];
  statuses?: string[];
  showArchived?: boolean;
}

/**
 * Fetch a paginated list of tasks across an entire workspace, filtered and
 * sorted. Used by the workspace-wide Tasks search page.
 */
export async function searchWorkspaceTasksList(
  workspaceId: string,
  filters: WorkspaceTaskFilters,
  sorts: SortOption[],
  page: number,
  pageSize: number,
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const membership = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: session.user.id, workspaceId } },
  });
  if (!membership) throw new Error("Not a member");

  const boardWhere: Record<string, unknown> = { workspaceId };
  if (!filters.showArchived) boardWhere.isActive = true;

  const where: Record<string, unknown> = { board: boardWhere };

  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q, mode: "insensitive" } },
      { description: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  if (filters.priorities && filters.priorities.length > 0) {
    where.priority =
      filters.priorities.length === 1
        ? (filters.priorities[0] as TaskPriority)
        : { in: filters.priorities as TaskPriority[] };
  }

  if (filters.statuses && filters.statuses.length > 0) {
    where.status =
      filters.statuses.length === 1
        ? (filters.statuses[0] as TaskStatus)
        : { in: filters.statuses as TaskStatus[] };
  }

  if (filters.tagFilters && filters.tagFilters.length > 0) {
    if (filters.tagFilters.length === 1) {
      where.tags = { some: { name: filters.tagFilters[0] } };
    } else {
      where.AND = filters.tagFilters.map((name) => ({
        tags: { some: { name } },
      }));
    }
  }

  if (filters.assigneeFilters && filters.assigneeFilters.length > 0) {
    const hasUnassigned = filters.assigneeFilters.includes("unassigned");
    const userIds = filters.assigneeFilters.filter((v) => v !== "unassigned");

    if (hasUnassigned && userIds.length > 0) {
      where.OR = [
        ...(Array.isArray(where.OR) ? where.OR : []),
        { assignees: { none: {} } },
        { assignees: { some: { id: { in: userIds } } } },
      ];
    } else if (hasUnassigned) {
      where.assignees = { none: {} };
    } else {
      where.assignees = { some: { id: { in: userIds } } };
    }
  }

  if (filters.boardIds && filters.boardIds.length > 0) {
    where.boardId = filters.boardIds.length === 1 ? filters.boardIds[0] : { in: filters.boardIds };
  }

  if (filters.sprintIds && filters.sprintIds.length > 0) {
    where.sprints = { some: { id: { in: filters.sprintIds } } };
  }

  const orderBy = buildOrderBy(sorts);
  const hasPrioritySort = sorts.some((s) => s.field === "priority");

  // If sorting by priority, fetch all matching to allow correct in-memory
  // priority ordering before paginating; otherwise paginate at the DB level.
  if (hasPrioritySort) {
    const [allTasks, total] = await Promise.all([
      prisma.task.findMany({
        where: where as never,
        orderBy,
        include: {
          assignees: { select: { id: true, name: true, image: true } },
          tags: { select: { name: true, color: true } },
          board: { select: { id: true, name: true, workspaceId: true } },
          subtasks: { select: { id: true, status: true } },
          _count: { select: { comments: true } },
        },
      }),
      prisma.task.count({ where: where as never }),
    ]);

    const prioritySort = sorts.find((s) => s.field === "priority")!;
    allTasks.sort((a, b) => {
      const aOrder = PRIORITY_ORDER[a.priority] ?? 99;
      const bOrder = PRIORITY_ORDER[b.priority] ?? 99;
      return prioritySort.direction === "asc" ? aOrder - bOrder : bOrder - aOrder;
    });

    const start = (page - 1) * pageSize;
    const tasks = allTasks.slice(start, start + pageSize).map((t) => ({
      ...t,
      boardId: t.board.id,
      workspaceId: t.board.workspaceId,
      commentCount: t._count.comments,
      subtaskTotal: t.subtasks.length,
      subtaskCompleted: t.subtasks.filter((s) => s.status === "COMPLETED").length,
    }));

    return { tasks, total };
  }

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where: where as never,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        assignees: { select: { id: true, name: true, image: true } },
        tags: { select: { name: true, color: true } },
        board: { select: { id: true, name: true, workspaceId: true } },
        subtasks: { select: { id: true, status: true } },
        _count: { select: { comments: true } },
      },
    }),
    prisma.task.count({ where: where as never }),
  ]);

  return {
    tasks: tasks.map((t) => ({
      ...t,
      boardId: t.board.id,
      workspaceId: t.board.workspaceId,
      commentCount: t._count.comments,
      subtaskTotal: t.subtasks.length,
      subtaskCompleted: t.subtasks.filter((s) => s.status === "COMPLETED").length,
    })),
    total,
  };
}

// ─── Dashboard: load paginated tasks assigned to the current user ───────────

export async function loadMyColumnTasks(
  status: string,
  offset: number,
  limit: number,
  filters?: {
    q?: string;
    priorities?: string[];
    tagFilters?: string[];
    workspaceIds?: string[];
    boardIds?: string[];
    sorts?: SortOption[];
  },
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Build where clause with optional filters
  const where: Record<string, unknown> = {
    status: status as TaskStatus,
    assignees: { some: { id: session.user.id } },
  };

  if (filters?.q) {
    where.OR = [
      { title: { contains: filters.q, mode: "insensitive" } },
      { description: { contains: filters.q, mode: "insensitive" } },
    ];
  }
  if (filters?.priorities && filters.priorities.length > 0) {
    where.priority =
      filters.priorities.length === 1
        ? (filters.priorities[0] as TaskPriority)
        : { in: filters.priorities as TaskPriority[] };
  }
  if (filters?.tagFilters && filters.tagFilters.length > 0) {
    if (filters.tagFilters.length === 1) {
      where.tags = { some: { name: filters.tagFilters[0] } };
    } else {
      where.AND = filters.tagFilters.map((name) => ({
        tags: { some: { name } },
      }));
    }
  }
  if (filters?.workspaceIds && filters.workspaceIds.length > 0) {
    where.board = {
      ...(where.board as Record<string, unknown> | undefined),
      workspaceId: filters.workspaceIds.length === 1 ? filters.workspaceIds[0] : { in: filters.workspaceIds },
    };
  }
  if (filters?.boardIds && filters.boardIds.length > 0) {
    where.boardId = filters.boardIds.length === 1 ? filters.boardIds[0] : { in: filters.boardIds };
  }

  const orderBy = buildOrderBy(filters?.sorts);

  const tasks = await prisma.task.findMany({
    where: where as never,
    orderBy,
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

  // If sorting by priority, re-sort in memory using custom priority order.
  const hasPrioritySort = filters?.sorts?.some((s) => s.field === "priority");
  if (hasPrioritySort) {
    const prioritySort = filters!.sorts!.find((s) => s.field === "priority")!;
    tasks.sort((a, b) => {
      const aOrder = PRIORITY_ORDER[a.priority] ?? 99;
      const bOrder = PRIORITY_ORDER[b.priority] ?? 99;
      return prioritySort.direction === "asc" ? aOrder - bOrder : bOrder - aOrder;
    });
  }

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
