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
import {
  TASK_PRIORITIES,
  TASK_STATUSES as STATUS_ORDER,
  STATUS_LABELS,
  STATUS_COLORS,
  PRIORITY_ORDER,
  parseSorts,
} from "@/lib/task-enums";
import { SprintActions } from "@/components/sprints/sprint-actions";
import { StandupModeFilter } from "@/components/sprints/standup-mode-filter";
import { AssignTaskSection } from "@/components/sprints/assign-task-section";
import { SprintViews } from "@/components/sprints/sprint-views";
import { CollapsibleSection } from "@/components/collapsible-section";
import { TaskFilters } from "@/components/tasks/task-filters";
import { SortControls } from "@/components/tasks/sort-controls";

/** Split a comma-separated param into a trimmed, non-empty array. */
function parseMulti(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export default async function SprintDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string; sprintId: string }>;
  searchParams: Promise<{
    q?: string;
    priority?: string;
    tag?: string;
    assignee?: string;
    sort?: string;
  }>;
}) {
  const { workspaceId, sprintId } = await params;
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

  const hasTaskFilter = Object.keys(taskWhere).length > 0;

  const taskInclude = {
    author: { select: { name: true } },
    assignees: { select: { id: true, name: true, image: true } },
    tags: { select: { name: true, color: true } },
    board: { select: { id: true, name: true } },
    subtasks: { select: { id: true, status: true } },
    _count: { select: { comments: true } },
  } as const;

  // Page sizes per column type
  const PAGE_SIZE_DEFAULT = 20;
  const PAGE_SIZE_COMPLETED = 20;

  // Build orderBy from sort options
  const orderBy =
    sorts.length > 0
      ? [
          ...sorts.map((s) => ({ [s.field]: s.direction })),
          { createdAt: "desc" as const },
        ]
      : [{ createdAt: "desc" as const }];

  const sprintTaskWhere = {
    sprints: { some: { id: sprintId } },
    ...taskWhere,
  };

  const [
    sprint,
    allSprintTasks,
    countsByStatus,
    totalTaskCount,
    tags,
    members,
    unassignedTasks,
    boards,
  ] = await Promise.all([
    prisma.sprint.findUnique({
      where: { id: sprintId },
      include: {
        tasks: {
          select: {
            id: true,
            status: true,
            startDate: true,
            dueDate: true,
            title: true,
            description: true,
            priority: true,
            boardId: true,
            parentTaskId: true,
          },
          where: hasTaskFilter ? taskWhere : undefined,
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    // Single task query instead of 4 separate findMany calls
    prisma.task.findMany({
      where: sprintTaskWhere,
      orderBy,
      include: taskInclude,
    }),
    // Single groupBy instead of 4 separate count() calls
    prisma.task.groupBy({
      by: ["status"],
      where: sprintTaskWhere,
      _count: true,
    }),
    // Always get total count for the sprint (unfiltered)
    prisma.task.count({
      where: { sprints: { some: { id: sprintId } } },
    }),
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
    // Moved from the second Promise.all to avoid a sequential waterfall
    prisma.task.findMany({
      where: {
        board: { workspaceId },
        sprints: { none: { id: sprintId } },
      },
      select: {
        id: true,
        title: true,
        board: { select: { name: true } },
        status: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.board.findMany({
      where: { workspaceId, isActive: true },
      select: { id: true, name: true },
      orderBy: { displayOrder: "asc" },
    }),
  ]);

  if (!sprint || sprint.workspaceId !== workspaceId) notFound();

  // Split tasks by status and apply per-column page limits
  const tasksByStatusRaw: Record<string, typeof allSprintTasks> = {};
  for (const task of allSprintTasks) {
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

  // For completion stats, we need unfiltered completed count
  let totalCompletedCount: number;
  if (hasTaskFilter) {
    totalCompletedCount = await prisma.task.count({
      where: {
        sprints: { some: { id: sprintId } },
        status: "COMPLETED",
      },
    });
  } else {
    totalCompletedCount = completedCount;
  }

  const effectivePerms = getEffectivePermissions(
    membership.role.permissions,
    userId,
    membership.workspace.createdById,
  );
  const canEdit = hasPermission(effectivePerms, Permission.EDIT_CONTENT);

  const mapTask = (
    t: Awaited<
      ReturnType<typeof prisma.task.findMany<{ include: typeof taskInclude }>>
    >[number],
  ) => ({
    ...t,
    boardId: t.board.id,
    commentCount: t._count.comments,
    subtaskIds: t.subtasks.map((s: { id: string }) => s.id),
    subtaskTotal: t.subtasks.length,
    subtaskCompleted: t.subtasks.filter(
      (s: { status: string }) => s.status === "COMPLETED",
    ).length,
  });

  type MappedTask = ReturnType<typeof mapTask>;

  const tasksByStatus: Record<string, MappedTask[]> = {
    NOT_STARTED: (notStartedTasks as Parameters<typeof mapTask>[0][]).map(
      mapTask,
    ),
    IN_PROGRESS: (inProgressTasks as Parameters<typeof mapTask>[0][]).map(
      mapTask,
    ),
    IN_REVIEW: (inReviewTasks as Parameters<typeof mapTask>[0][]).map(mapTask),
    COMPLETED: (completedTasks as Parameters<typeof mapTask>[0][]).map(mapTask),
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

  // Full (unsliced) columns for the list view
  const allTasksByStatus: Record<string, MappedTask[]> = {};
  for (const status of STATUS_ORDER) {
    allTasksByStatus[status] = (
      (tasksByStatusRaw[status] ?? []) as Parameters<typeof mapTask>[0][]
    ).map(mapTask);
  }
  if (prioritySort) {
    for (const tasks of Object.values(allTasksByStatus)) {
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
  const allColumns = STATUS_ORDER.map((status) => ({
    status,
    label: STATUS_LABELS[status],
    color: STATUS_COLORS[status],
    tasks: allTasksByStatus[status] ?? [],
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

  // Timeline
  const now = new Date();
  let progress = 0;
  if (sprint.startDate && sprint.endDate) {
    const start = new Date(sprint.startDate).getTime();
    const end = new Date(sprint.endDate).getTime();
    const total = end - start;
    if (total > 0) {
      progress = Math.min(
        100,
        Math.max(0, ((now.getTime() - start) / total) * 100),
      );
    }
  }

  const taskCompletion =
    totalTaskCount > 0
      ? Math.round((totalCompletedCount / totalTaskCount) * 100)
      : 0;

  const filteredCount =
    notStartedCount + inProgressCount + inReviewCount + completedCount;

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href={`/w/${workspaceId}/s`}
        className="mb-6 inline-flex items-center gap-1.5 text-xs text-fg-muted transition-colors hover:text-fg-secondary"
      >
        <ArrowLeft size={12} />
        All sprints
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-mono text-lg font-semibold text-fg-primary">
              {sprint.title}
            </h1>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                sprint.isActive
                  ? "bg-accent/10 text-accent"
                  : "bg-bg-secondary text-fg-muted"
              }`}
            >
              {sprint.isActive ? "Active" : "Closed"}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-3 text-[11px] text-fg-muted">
            <span>
              {hasTaskFilter ? (
                <>
                  {filteredCount} of {totalTaskCount} task
                  {totalTaskCount !== 1 && "s"}
                </>
              ) : (
                <>
                  {totalTaskCount} task
                  {totalTaskCount !== 1 && "s"}
                </>
              )}{" "}
              · {taskCompletion}% done
            </span>
          </div>
        </div>
        <SprintActions
          sprint={{
            id: sprint.id,
            title: sprint.title,
            startDate: sprint.startDate?.toISOString().split("T")[0] ?? "",
            endDate: sprint.endDate?.toISOString().split("T")[0] ?? "",
            isActive: sprint.isActive,
          }}
          workspaceId={workspaceId}
          permissions={effectivePerms}
        />
      </div>

      {/* Timeline */}
      {sprint.startDate && sprint.endDate && (
        <CollapsibleSection title="Timeline" className="mt-4">
          <div className="flex items-center justify-between text-[11px] text-fg-muted">
            <div className="flex items-center gap-1">
              <Calendar size={11} />
              {new Date(sprint.startDate).toLocaleDateString()}
            </div>
            <span>{Math.round(progress)}% elapsed</span>
            <div className="flex items-center gap-1">
              <Calendar size={11} />
              {new Date(sprint.endDate).toLocaleDateString()}
            </div>
          </div>
          <div className="mt-2 h-2 rounded-full bg-bg-secondary">
            <div
              className="h-2 rounded-full transition-all"
              style={{
                width: `${progress}%`,
                background: `linear-gradient(to right, var(--accent), var(--accent-emphasis))`,
              }}
            />
          </div>
          {/* Task completion bar */}
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[11px] text-fg-muted">Tasks:</span>
            <div className="flex-1 h-1.5 rounded-full bg-bg-secondary">
              <div
                className="h-1.5 rounded-full bg-[#6bc96b] transition-all"
                style={{ width: `${taskCompletion}%` }}
              />
            </div>
            <span className="text-[11px] text-fg-muted">
              {totalCompletedCount}/{totalTaskCount}
            </span>
          </div>
        </CollapsibleSection>
      )}

      {/* Assign tasks */}
      {canEdit && (
        <div className="mt-4 rounded-md border border-border bg-bg-elevated/60 p-4 backdrop-blur-sm">
          <AssignTaskSection
            sprintId={sprintId}
            workspaceId={workspaceId}
            assignedTaskIds={sprint.tasks.map((t) => t.id)}
            unassignedTasks={unassignedTasks}
          />
        </div>
      )}

      {/* Filters + Task views */}
      <div className="mt-6 space-y-4">
        <TaskFilters
          tags={tags}
          assignees={members.map((m) => m.user)}
          currentQ={q}
          currentPriorities={priorities}
          currentTags={tagFilters}
          currentAssignees={assigneeFilters}
          extraControls={
            <>
              <SortControls currentSorts={sorts} />
              <StandupModeFilter members={members.map((m) => m.user)} />
            </>
          }
        />

        <SprintViews
          columns={columns}
          allColumns={allColumns}
          tasks={sprint.tasks.map((t) => ({
            ...t,
            author: { name: null },
            assignees: [],
            tags: [],
            board: { id: t.boardId, name: "" },
            subtaskIds: [],
          }))}
          sprintId={sprintId}
          sprintStart={sprint.startDate}
          sprintEnd={sprint.endDate}
          workspaceId={workspaceId}
          hasTimeline={!!sprint.startDate && !!sprint.endDate}
          boards={boards}
          canCreate={canEdit}
          members={members.map((m) => m.user)}
          tags={tags}
          columnCounts={columnCounts}
          columnPageSizes={columnPageSizes}
          columnFilters={{
            q,
            priorities,
            tagFilters,
            assigneeFilters,
            sprintId,
            sorts,
          }}
        />
      </div>
    </div>
  );
}
