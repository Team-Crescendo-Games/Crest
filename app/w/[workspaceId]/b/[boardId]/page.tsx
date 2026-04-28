import { getSession } from "@/lib/cached-auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar } from "lucide-react";
import { TaskPriority } from "@/prisma/generated/prisma/enums";
import {
  hasPermission,
  getEffectivePermissions,
  Permission,
} from "@/lib/permissions";
import { BoardActions } from "@/components/boards/board-actions";
import { TaskFilters } from "@/components/tasks/task-filters";
import { BoardViews } from "@/components/boards/board-views";
import { SortControls } from "@/components/tasks/sort-controls";
import {
  TASK_PRIORITIES,
  TASK_STATUSES as STATUS_ORDER,
  STATUS_LABELS,
  STATUS_COLORS,
  PRIORITY_ORDER,
  parseSorts,
} from "@/lib/task-enums";

/** Split a comma-separated param into a trimmed, non-empty array. */
function parseMulti(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export default async function BoardDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string; boardId: string }>;
  searchParams: Promise<{
    q?: string;
    priority?: string;
    tag?: string;
    assignee?: string;
    sort?: string;
  }>;
}) {
  const { workspaceId, boardId } = await params;
  const {
    q,
    priority: priorityParam,
    tag: tagParam,
    assignee: assigneeParam,
    sort: sortParam,
  } = await searchParams;
  const session = await getSession();
  const userId = session!.user!.id!;

  const membership = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
    include: { role: true, workspace: { select: { createdById: true } } },
  });

  if (!membership) notFound();

  // Parse comma-separated multi-value params
  const priorities = parseMulti(priorityParam).filter((p) =>
    (TASK_PRIORITIES as readonly string[]).includes(p),
  );
  const tagFilters = parseMulti(tagParam);
  const assigneeFilters = parseMulti(assigneeParam);
  const sorts = parseSorts(sortParam);

  // Build task where-clause for filters
  const taskWhere: Record<string, unknown> = {};
  if (q) {
    taskWhere.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }
  if (priorities.length === 1) {
    taskWhere.priority = priorities[0] as TaskPriority;
  } else if (priorities.length > 1) {
    taskWhere.priority = { in: priorities as TaskPriority[] };
  }
  if (tagFilters.length === 1) {
    taskWhere.tags = { some: { name: tagFilters[0] } };
  } else if (tagFilters.length > 1) {
    taskWhere.AND = tagFilters.map((name) => ({
      tags: { some: { name } },
    }));
  }
  if (assigneeFilters.length > 0) {
    const hasUnassigned = assigneeFilters.includes("unassigned");
    const userIds = assigneeFilters.filter((v) => v !== "unassigned");

    if (hasUnassigned && userIds.length > 0) {
      // "unassigned" OR specific users — match either
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

  // Page sizes per column type
  const PAGE_SIZE_DEFAULT = 20;
  const PAGE_SIZE_COMPLETED = 20;

  const taskInclude = {
    author: { select: { name: true } },
    assignees: { select: { id: true, name: true, image: true } },
    tags: { select: { name: true, color: true } },
    subtasks: { select: { id: true, status: true } },
    _count: { select: { comments: true } },
  } as const;

  // Build orderBy from sort options
  const orderBy =
    sorts.length > 0
      ? [
          ...sorts.map((s) => ({ [s.field]: s.direction })),
          { createdAt: "desc" as const },
        ]
      : [{ createdAt: "desc" as const }];

  // Fire all independent queries in parallel — use groupBy for counts
  // instead of 4 separate count() calls, and fetch tasks in one query
  // instead of 4 separate findMany calls.
  const [
    allTasks,
    countsByStatus,
    board,
    totalTaskCount,
    tags,
    members,
    sprints,
  ] = await Promise.all([
    // Single task query — fetch up to pageLimit per status via a combined query.
    // We fetch all statuses at once and split in JS. This trades a slightly
    // larger result set for 3 fewer round-trips.
    prisma.task.findMany({
      where: { boardId, ...taskWhere },
      orderBy,
      include: taskInclude,
    }),
    // Single groupBy replaces 4 separate count() calls
    prisma.task.groupBy({
      by: ["status"],
      where: { boardId, ...taskWhere },
      _count: true,
    }),
    prisma.board.findUnique({ where: { id: boardId } }),
    prisma.task.count({ where: { boardId } }),
    prisma.tag.findMany({
      where: { workspaceId },
      select: { id: true, name: true, color: true },
      orderBy: { name: "asc" },
    }),
    prisma.workspaceMember.findMany({
      where: { workspaceId },
      select: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.sprint.findMany({
      where: { workspaceId, isActive: true },
      select: { id: true, title: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Split tasks by status and apply per-column page limits
  const tasksByStatusRaw: Record<string, typeof allTasks> = {};
  for (const task of allTasks) {
    const list = (tasksByStatusRaw[task.status] ??= []);
    list.push(task);
  }

  const statusPageSizes: Record<string, number> = {
    NOT_STARTED: PAGE_SIZE_DEFAULT,
    IN_PROGRESS: PAGE_SIZE_DEFAULT,
    IN_REVIEW: PAGE_SIZE_DEFAULT,
    COMPLETED: PAGE_SIZE_COMPLETED,
  };

  const notStartedTasks = (tasksByStatusRaw["NOT_STARTED"] ?? []).slice(0, statusPageSizes["NOT_STARTED"]);
  const inProgressTasks = (tasksByStatusRaw["IN_PROGRESS"] ?? []).slice(0, statusPageSizes["IN_PROGRESS"]);
  const inReviewTasks = (tasksByStatusRaw["IN_REVIEW"] ?? []).slice(0, statusPageSizes["IN_REVIEW"]);
  const completedTasks = (tasksByStatusRaw["COMPLETED"] ?? []).slice(0, statusPageSizes["COMPLETED"]);

  // Build count map from groupBy result
  const countMap: Record<string, number> = {};
  for (const row of countsByStatus) {
    countMap[row.status] = row._count;
  }
  const notStartedCount = countMap["NOT_STARTED"] ?? 0;
  const inProgressCount = countMap["IN_PROGRESS"] ?? 0;
  const inReviewCount = countMap["IN_REVIEW"] ?? 0;
  const completedCount = countMap["COMPLETED"] ?? 0;

  if (!board || board.workspaceId !== workspaceId) notFound();

  const effectivePerms = getEffectivePermissions(
    membership.role.permissions,
    userId,
    membership.workspace.createdById,
  );
  const canCreate = hasPermission(effectivePerms, Permission.CREATE_CONTENT);

  const mapTask = (t: (typeof completedTasks)[number]) => ({
    ...t,
    commentCount: t._count.comments,
    subtaskIds: t.subtasks.map((s) => s.id),
    subtaskTotal: t.subtasks.length,
    subtaskCompleted: t.subtasks.filter((s) => s.status === "COMPLETED").length,
  });

  // Build per-status task lists
  const tasksByStatus: Record<string, ReturnType<typeof mapTask>[]> = {
    NOT_STARTED: notStartedTasks.map(mapTask),
    IN_PROGRESS: inProgressTasks.map(mapTask),
    IN_REVIEW: inReviewTasks.map(mapTask),
    COMPLETED: completedTasks.map(mapTask),
  };

  // Re-sort by priority in memory if needed (Prisma sorts enum alphabetically)
  const prioritySort = sorts.find((s) => s.field === "priority");
  if (prioritySort) {
    for (const tasks of Object.values(tasksByStatus)) {
      tasks.sort((a, b) => {
        const aOrder =
          PRIORITY_ORDER[a.priority as keyof typeof PRIORITY_ORDER] ?? 99;
        const bOrder =
          PRIORITY_ORDER[b.priority as keyof typeof PRIORITY_ORDER] ?? 99;
        return prioritySort.direction === "asc"
          ? aOrder - bOrder
          : bOrder - aOrder;
      });
    }
  }

  const columns = STATUS_ORDER.map((status) => ({
    status,
    label: STATUS_LABELS[status],
    color: STATUS_COLORS[status],
    tasks: tasksByStatus[status] ?? [],
  }));

  const columnCounts: Record<string, number> = {
    NOT_STARTED: notStartedCount,
    IN_PROGRESS: inProgressCount,
    IN_REVIEW: inReviewCount,
    COMPLETED: completedCount,
  };

  const columnPageSizes: Record<string, number> = {
    NOT_STARTED: PAGE_SIZE_DEFAULT,
    IN_PROGRESS: PAGE_SIZE_DEFAULT,
    IN_REVIEW: PAGE_SIZE_DEFAULT,
    COMPLETED: PAGE_SIZE_COMPLETED,
  };

  const allTaskCount =
    notStartedCount + inProgressCount + inReviewCount + completedCount;

  const hasFilters =
    !!q ||
    priorities.length > 0 ||
    tagFilters.length > 0 ||
    assigneeFilters.length > 0;
  const filteredCount =
    notStartedCount + inProgressCount + inReviewCount + completedCount;

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href={`/w/${workspaceId}/b`}
        className="mb-6 inline-flex items-center gap-1.5 text-xs text-fg-muted transition-colors hover:text-fg-secondary"
      >
        <ArrowLeft size={12} />
        All boards
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-mono text-lg font-semibold text-fg-primary">
              {board.name}
            </h1>
            {!board.isActive && (
              <span className="rounded bg-bg-secondary px-1.5 py-0.5 text-[9px] text-fg-muted">
                Archived
              </span>
            )}
          </div>
          {board.description && (
            <p className="mt-1 text-xs text-fg-muted">{board.description}</p>
          )}
          <div className="mt-1 flex items-center gap-1.5 text-[10px] text-fg-muted">
            <Calendar size={10} />
            Created {board.createdAt.toLocaleDateString()}
            <span className="text-border">·</span>
            {hasFilters ? (
              <>
                {filteredCount} of {totalTaskCount} task
                {totalTaskCount !== 1 && "s"}
              </>
            ) : (
              <>
                {allTaskCount} task{allTaskCount !== 1 && "s"}
              </>
            )}
          </div>
        </div>
        <BoardActions
          board={{
            id: board.id,
            name: board.name,
            description: board.description,
            isActive: board.isActive,
          }}
          workspaceId={workspaceId}
          permissions={effectivePerms}
        />
      </div>

      <div className="mt-6 space-y-4">
        <TaskFilters
          tags={tags}
          assignees={members.map((m) => m.user)}
          currentQ={q}
          currentPriorities={priorities}
          currentTags={tagFilters}
          currentAssignees={assigneeFilters}
          extraControls={<SortControls currentSorts={sorts} />}
        />

        <BoardViews
          columns={columns}
          boardId={boardId}
          workspaceId={workspaceId}
          canCreate={canCreate}
          sprints={sprints}
          members={members.map((m) => m.user)}
          tags={tags}
          columnCounts={columnCounts}
          columnPageSizes={columnPageSizes}
          columnFilters={{
            q,
            priorities,
            tagFilters,
            assigneeFilters,
            sorts,
          }}
        />
      </div>
    </div>
  );
}
