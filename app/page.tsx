import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  TASK_STATUSES as STATUS_ORDER,
  TASK_PRIORITIES,
  STATUS_LABELS,
  STATUS_COLORS,
  PRIORITY_ORDER,
  parseSorts,
} from "@/lib/task-enums";
import { DashboardKanban } from "@/components/dashboard/dashboard-kanban";
import { NotificationFeed } from "@/components/dashboard/notification-feed";
import { UserMetrics } from "@/components/dashboard/user-metrics";
import { TaskFilters } from "@/components/tasks/task-filters";
import { SortControls } from "@/components/tasks/sort-controls";
import { getWeeklyCompletedPoints, getTasksByTag } from "@/lib/actions/metrics";
import { DashboardFilterDropdowns } from "@/components/dashboard/dashboard-filter-dropdowns";
import type { TaskPriority } from "@/prisma/generated/prisma/enums";

import { parseMulti } from "@/lib/url-helpers";

const NOTIF_PAGE = 10;
const TASKS_PER_COLUMN = 5;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    priority?: string;
    tag?: string;
    workspace?: string;
    board?: string;
    sort?: string;
  }>;
}) {
  const {
    q,
    priority: priorityParam,
    tag: tagParam,
    workspace: workspaceParam,
    board: boardParam,
    sort: sortParam,
  } = await searchParams;
  const session = await auth();
  const userId = session!.user!.id!;

  const priorities = parseMulti(priorityParam).filter((p) => (TASK_PRIORITIES as readonly string[]).includes(p));
  const tagFilters = parseMulti(tagParam);
  const workspaceFilters = parseMulti(workspaceParam);
  const boardFilters = parseMulti(boardParam);
  const sorts = parseSorts(sortParam);

  const taskWhere: Record<string, unknown> = {
    assignees: { some: { id: userId } },
  };
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
  if (workspaceFilters.length > 0) {
    taskWhere.board = {
      ...(taskWhere.board as Record<string, unknown> | undefined),
      workspaceId: workspaceFilters.length === 1 ? workspaceFilters[0] : { in: workspaceFilters },
    };
  }
  if (boardFilters.length > 0) {
    taskWhere.boardId = boardFilters.length === 1 ? boardFilters[0] : { in: boardFilters };
  }

  const statusCountRows = await prisma.task.groupBy({
    by: ["status"],
    where: taskWhere as never,
    _count: true,
    _sum: { points: true },
  });
  const statusCounts: Record<string, number> = {};
  let totalPoints = 0;
  for (const row of statusCountRows) {
    statusCounts[row.status] = row._count;
    totalPoints += row._sum.points ?? 0;
  }

  const [workspaceCount, notifResult, initialWeeklyPoints, initialTagData, userWorkspaces, ...columnTaskResults] =
    await Promise.all([
      prisma.workspaceMember.count({ where: { userId } }),
      prisma.$transaction([
        prisma.notification.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: NOTIF_PAGE,
          include: {
            task: {
              select: {
                id: true,
                title: true,
                board: { select: { id: true, workspaceId: true } },
              },
            },
          },
        }),
        prisma.notification.count({ where: { userId } }),
      ]),
      getWeeklyCompletedPoints(userId, 8),
      getTasksByTag(userId),
      prisma.workspaceMember.findMany({
        where: { userId },
        select: {
          workspace: {
            select: {
              id: true,
              name: true,
              boards: {
                where: { isActive: true },
                select: { id: true, name: true },
                orderBy: { displayOrder: "asc" },
              },
            },
          },
        },
        orderBy: { workspace: { name: "asc" } },
      }),
      ...STATUS_ORDER.map((status) =>
        prisma.task.findMany({
          where: {
            ...taskWhere,
            status,
          } as never,
          orderBy:
            sorts.length > 0
              ? [...sorts.map((s) => ({ [s.field]: s.direction })), { createdAt: "desc" as const }]
              : [{ createdAt: "desc" as const }],
          take: TASKS_PER_COLUMN,
          include: {
            assignees: { select: { id: true, name: true, image: true } },
            tags: { select: { name: true, color: true } },
            board: { select: { id: true, name: true, workspaceId: true } },
            subtasks: { select: { id: true, status: true } },
            _count: { select: { comments: true } },
          },
        }),
      ),
    ]);

  const [initialNotifications, totalNotifications] = notifResult;

  const totalAssigned = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  const completedTasks = statusCounts["COMPLETED"] ?? 0;
  const unreadCount = initialNotifications.filter((n) => !n.isRead).length;

  const columns = STATUS_ORDER.map((status, i) => ({
    status,
    label: STATUS_LABELS[status],
    color: STATUS_COLORS[status],
    tasks: columnTaskResults[i].map((t) => ({
      ...t,
      boardId: t.board.id,
      workspaceId: t.board.workspaceId,
      commentCount: t._count.comments,
      subtaskIds: t.subtasks.map((s) => s.id),
      subtaskTotal: t.subtasks.length,
      subtaskCompleted: t.subtasks.filter((s) => s.status === "COMPLETED").length,
    })),
  }));

  // Re-sort by priority in memory if needed (Prisma sorts enum alphabetically)
  const prioritySort = sorts.find((s) => s.field === "priority");
  if (prioritySort) {
    for (const col of columns) {
      col.tasks.sort((a, b) => {
        const aOrder = PRIORITY_ORDER[a.priority as keyof typeof PRIORITY_ORDER] ?? 99;
        const bOrder = PRIORITY_ORDER[b.priority as keyof typeof PRIORITY_ORDER] ?? 99;
        return prioritySort.direction === "asc" ? aOrder - bOrder : bOrder - aOrder;
      });
    }
  }

  const columnCounts: Record<string, number> = {};
  const columnPageSizes: Record<string, number> = {};
  for (const status of STATUS_ORDER) {
    const count = statusCounts[status] ?? 0;
    columnCounts[status] = count;
    columnPageSizes[status] = TASKS_PER_COLUMN;
  }

  const workspaceOptions = userWorkspaces.map((m) => m.workspace);
  // If workspace filter is active, only show boards from those workspaces
  const boardOptions =
    workspaceFilters.length > 0
      ? workspaceOptions
          .filter((w) => workspaceFilters.includes(w.id))
          .flatMap((w) => w.boards.map((b) => ({ ...b, workspaceName: w.name })))
      : workspaceOptions.flatMap((w) => w.boards.map((b) => ({ ...b, workspaceName: w.name })));

  const allTagsRaw = await prisma.tag.findMany({
    where: {
      workspace: {
        members: { some: { userId } },
        ...(workspaceFilters.length > 0
          ? {
              id: workspaceFilters.length === 1 ? workspaceFilters[0] : { in: workspaceFilters },
            }
          : {}),
      },
    },
    select: { name: true, color: true, workspace: { select: { name: true } } },
    orderBy: { name: "asc" },
  });

  // Deduplicate tags by name (keep first occurrence) and attach workspace name
  const seenTagNames = new Set<string>();
  const allTags = allTagsRaw
    .map((t) => ({
      name: t.name,
      color: t.color,
      workspaceName: t.workspace.name,
    }))
    .filter((t) => {
      if (seenTagNames.has(t.name)) return false;
      seenTagNames.add(t.name);
      return true;
    });

  const hasFilters =
    !!q || priorities.length > 0 || tagFilters.length > 0 || workspaceFilters.length > 0 || boardFilters.length > 0;

  const dashboardFilters = {
    q,
    priorities,
    tagFilters,
    workspaceIds: workspaceFilters,
    boardIds: boardFilters,
    sorts,
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-mono text-lg font-semibold text-fg-primary">
          Welcome back, <span className="text-accent">{session!.user!.name}</span>
        </h1>
        <p className="mt-1 text-xs text-fg-muted">Here&apos;s what&apos;s happening across your workspaces.</p>
      </div>

      {/* Stats + Notifications row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Stats */}
        <div className="space-y-3">
          <SectionHeading>Overview</SectionHeading>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Workspaces" value={workspaceCount} barColor="#f1c258" />
            <StatCard label="Assigned Tasks" value={totalAssigned} barColor="#f0a468" />
            <StatCard label="Completed" value={completedTasks} barColor="#6bc96b" />
            <StatCard label="Total Points" value={totalPoints} barColor="#9c9c98" />
          </div>
        </div>

        {/* Notifications */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <SectionHeading>Notifications</SectionHeading>
            {unreadCount > 0 && (
              <span className="rounded-full bg-accent/15 px-2 py-0.5 font-mono text-[10px] text-accent">
                {unreadCount} unread
              </span>
            )}
          </div>
          <div className="rounded-md border border-border bg-bg-elevated/60 p-3 backdrop-blur-sm max-h-[320px] overflow-y-auto">
            <NotificationFeed initial={initialNotifications} totalCount={totalNotifications} />
          </div>
        </div>
      </div>

      {/* My Tasks kanban */}
      <div className="space-y-3">
        <SectionHeading>My Tasks</SectionHeading>

        <TaskFilters
          tags={allTags}
          assignees={[]}
          hideAssignees
          currentQ={q}
          currentPriorities={priorities}
          currentTags={tagFilters}
          currentAssignees={[]}
          extraParams={{
            workspace: workspaceFilters.length > 0 ? workspaceFilters.join(",") : undefined,
            board: boardFilters.length > 0 ? boardFilters.join(",") : undefined,
          }}
          extraControls={
            <>
              <DashboardExtraFilters
                workspaces={workspaceOptions}
                boards={boardOptions}
                currentWorkspaces={workspaceFilters}
                currentBoards={boardFilters}
              />
              <SortControls
                currentSorts={sorts}
                extraParams={{
                  workspace: workspaceFilters.length > 0 ? workspaceFilters.join(",") : undefined,
                  board: boardFilters.length > 0 ? boardFilters.join(",") : undefined,
                }}
              />
            </>
          }
        />

        {totalAssigned === 0 ? (
          <p className="py-8 text-center text-xs text-fg-muted">
            {hasFilters ? "No tasks match your filters." : "No tasks assigned to you yet."}
          </p>
        ) : (
          <DashboardKanban
            columns={columns}
            columnCounts={columnCounts}
            columnPageSizes={columnPageSizes}
            filters={dashboardFilters}
            workspaces={workspaceOptions}
          />
        )}
      </div>

      {/* Metrics */}
      <div className="space-y-3">
        <SectionHeading>Metrics</SectionHeading>
        <UserMetrics userId={userId} initialWeeklyData={initialWeeklyPoints} initialTagData={initialTagData} />
      </div>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-mono text-sm font-medium text-fg-primary">{children}</h2>
      <div className="mt-1 h-px w-8 bg-accent-subtle" />
    </div>
  );
}

function StatCard({ label, value, barColor }: { label: string; value: number; barColor?: string }) {
  return (
    <div className="relative overflow-hidden rounded-md border border-border bg-bg-elevated/60 backdrop-blur-sm">
      {barColor && <div className="absolute left-0 top-0 h-full w-1" style={{ backgroundColor: barColor }} />}
      <div className="p-4 pl-5">
        <p className="text-[11px] font-medium uppercase tracking-wider text-fg-muted">{label}</p>
        <p className="mt-1.5 font-mono text-2xl font-semibold text-fg-primary">{value}</p>
      </div>
    </div>
  );
}

/* ─── Dashboard-specific filter dropdowns (workspace + board) ──────────── */

function DashboardExtraFilters({
  workspaces,
  boards,
  currentWorkspaces,
  currentBoards,
}: {
  workspaces: { id: string; name: string }[];
  boards: { id: string; name: string; workspaceName: string }[];
  currentWorkspaces: string[];
  currentBoards: string[];
}) {
  return (
    <DashboardFilterDropdowns
      workspaces={workspaces}
      boards={boards}
      currentWorkspaces={currentWorkspaces}
      currentBoards={currentBoards}
    />
  );
}
