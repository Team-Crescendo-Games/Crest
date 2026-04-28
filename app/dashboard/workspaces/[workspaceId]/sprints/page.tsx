import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Timer } from "lucide-react";
import { SprintRow } from "./sprint-row";
import { SprintExtras } from "./sprint-extras";
import { TaskFilters } from "@/components/task-filters";
import { getEffectivePermissions } from "@/lib/permissions";
import { TaskStatus, TaskPriority } from "@/prisma/generated/prisma/enums";
import {
  TASK_STATUSES as STATUS_ORDER,
  STATUS_LABELS,
  STATUS_COLORS,
  TASK_PRIORITIES,
} from "@/lib/task-enums";

const PAGE_SIZE_DEFAULT = 5;
const PAGE_SIZE_COMPLETED = 5;

/** Split a comma-separated param into a trimmed, non-empty array. */
function parseMulti(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export default async function SprintsPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<{
    showClosed?: string;
    q?: string;
    priority?: string;
    tag?: string;
    assignee?: string;
  }>;
}) {
  const { workspaceId } = await params;
  const {
    showClosed,
    q,
    priority: priorityParam,
    tag: tagParam,
    assignee: assigneeParam,
  } = await searchParams;
  const session = await auth();
  const userId = session!.user!.id!;

  const membership = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
    include: {
      role: true,
      workspace: { select: { name: true, createdById: true } },
    },
  });

  if (!membership) notFound();

  const includeClosed = showClosed === "true";

  // Parse multi-value filter params
  const priorities = parseMulti(priorityParam).filter((p) =>
    (TASK_PRIORITIES as readonly string[]).includes(p),
  );
  const tagFilters = parseMulti(tagParam);
  const assigneeFilters = parseMulti(assigneeParam);

  // Build task filter applied to tasks within each sprint
  function buildTaskWhere(sprintId: string, status: TaskStatus) {
    const where: Record<string, unknown> = {
      sprints: { some: { id: sprintId } },
      status,
    };
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }
    if (priorities.length === 1) {
      where.priority = priorities[0] as TaskPriority;
    } else if (priorities.length > 1) {
      where.priority = { in: priorities as TaskPriority[] };
    }
    if (tagFilters.length === 1) {
      where.tags = { some: { name: tagFilters[0] } };
    } else if (tagFilters.length > 1) {
      where.AND = tagFilters.map((name) => ({
        tags: { some: { name } },
      }));
    }
    if (assigneeFilters.length > 0) {
      const hasUnassigned = assigneeFilters.includes("unassigned");
      const userIds = assigneeFilters.filter((v) => v !== "unassigned");
      if (hasUnassigned && userIds.length > 0) {
        where.OR = [
          ...(where.OR ? (where.OR as unknown[]) : []),
          { assignees: { none: {} } },
          { assignees: { some: { id: { in: userIds } } } },
        ];
      } else if (hasUnassigned) {
        where.assignees = { none: {} };
      } else {
        where.assignees = { some: { id: { in: userIds } } };
      }
    }
    return where;
  }

  const [sprintList, allTags, allMembers, closedCount] = await Promise.all([
    prisma.sprint.findMany({
      where: {
        workspaceId,
        ...(includeClosed ? {} : { isActive: true }),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        startDate: true,
        endDate: true,
        isActive: true,
        _count: { select: { tasks: true } },
      },
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
    prisma.sprint.count({ where: { workspaceId, isActive: false } }),
  ]);

  const taskInclude = {
    author: { select: { name: true } },
    assignees: { select: { id: true, name: true, image: true } },
    tags: { select: { name: true, color: true } },
    board: { select: { id: true, name: true } },
  } as const;

  // For each sprint, fetch per-status task pages + counts in parallel
  const sprintData = await Promise.all(
    sprintList.map(async (sprint) => {
      const [
        notStartedTasks,
        notStartedCount,
        inProgressTasks,
        inProgressCount,
        inReviewTasks,
        inReviewCount,
        completedTasks,
        completedCount,
        totalTaskCount,
      ] = await Promise.all([
        prisma.task.findMany({
          where: buildTaskWhere(sprint.id, "NOT_STARTED" as TaskStatus),
          orderBy: { createdAt: "desc" },
          take: PAGE_SIZE_DEFAULT,
          include: taskInclude,
        }),
        prisma.task.count({
          where: buildTaskWhere(sprint.id, "NOT_STARTED" as TaskStatus),
        }),
        prisma.task.findMany({
          where: buildTaskWhere(sprint.id, "IN_PROGRESS" as TaskStatus),
          orderBy: { createdAt: "desc" },
          take: PAGE_SIZE_DEFAULT,
          include: taskInclude,
        }),
        prisma.task.count({
          where: buildTaskWhere(sprint.id, "IN_PROGRESS" as TaskStatus),
        }),
        prisma.task.findMany({
          where: buildTaskWhere(sprint.id, "IN_REVIEW" as TaskStatus),
          orderBy: { createdAt: "desc" },
          take: PAGE_SIZE_DEFAULT,
          include: taskInclude,
        }),
        prisma.task.count({
          where: buildTaskWhere(sprint.id, "IN_REVIEW" as TaskStatus),
        }),
        prisma.task.findMany({
          where: buildTaskWhere(sprint.id, "COMPLETED" as TaskStatus),
          orderBy: { createdAt: "desc" },
          take: PAGE_SIZE_COMPLETED,
          include: taskInclude,
        }),
        prisma.task.count({
          where: buildTaskWhere(sprint.id, "COMPLETED" as TaskStatus),
        }),
        prisma.task.count({ where: { sprints: { some: { id: sprint.id } } } }),
      ]);

      const tasksByStatus: Record<string, typeof notStartedTasks> = {
        NOT_STARTED: notStartedTasks,
        IN_PROGRESS: inProgressTasks,
        IN_REVIEW: inReviewTasks,
        COMPLETED: completedTasks,
      };

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

      return { sprint: { ...sprint, totalTaskCount }, columns, columnCounts };
    }),
  );

  const hasTaskFilter =
    !!q ||
    priorities.length > 0 ||
    tagFilters.length > 0 ||
    assigneeFilters.length > 0;

  const columnPageSizes: Record<string, number> = {
    NOT_STARTED: PAGE_SIZE_DEFAULT,
    IN_PROGRESS: PAGE_SIZE_DEFAULT,
    IN_REVIEW: PAGE_SIZE_DEFAULT,
    COMPLETED: PAGE_SIZE_COMPLETED,
  };

  const baseColumnFilters = hasTaskFilter
    ? { q, priorities, tagFilters, assigneeFilters }
    : undefined;

  const extraParams: Record<string, string | undefined> = {
    showClosed: includeClosed ? "true" : undefined,
  };

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href={`/dashboard/workspaces/${workspaceId}`}
        className="mb-6 inline-flex items-center gap-1.5 text-xs text-fg-muted transition-colors hover:text-fg-secondary"
      >
        <ArrowLeft size={12} />
        Back to workspace
      </Link>

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Timer size={16} className="text-accent" />
          <h1 className="font-mono text-lg font-semibold text-fg-primary">
            Sprints in{" "}
            <span className="text-accent">{membership.workspace.name}</span>
          </h1>
        </div>
        <Link
          href={`/dashboard/workspaces/${workspaceId}/sprints/new`}
          className="flex items-center gap-1 rounded-md bg-accent/10 px-2.5 py-1.5 text-[11px] font-medium text-accent transition-colors hover:bg-accent/20"
        >
          <Plus size={11} />
          New Sprint
        </Link>
      </div>

      {/* Filters */}
      <div className="mt-4">
        <TaskFilters
          tags={allTags}
          assignees={allMembers.map((m) => m.user)}
          currentQ={q}
          currentPriorities={priorities}
          currentTags={tagFilters}
          currentAssignees={assigneeFilters}
          extraParams={extraParams}
          extraControls={
            <SprintExtras
              workspaceId={workspaceId}
              showClosed={includeClosed}
              closedCount={closedCount}
            />
          }
        />
      </div>

      {/* Sprint rows */}
      <div className="mt-6">
        {sprintData.length === 0 ? (
          <p className="mt-8 text-center text-xs text-fg-muted">
            {hasTaskFilter
              ? "No results match your filters."
              : "No sprints yet."}
          </p>
        ) : (
          <div className="space-y-3">
            {sprintData.map(({ sprint, columns, columnCounts }) => (
              <SprintRow
                key={sprint.id}
                sprint={sprint}
                workspaceId={workspaceId}
                columns={columns}
                columnCounts={columnCounts}
                columnPageSizes={columnPageSizes}
                columnFilters={{
                  ...baseColumnFilters,
                  sprintId: sprint.id,
                }}
                permissions={getEffectivePermissions(
                  membership.role.permissions,
                  userId,
                  membership.workspace.createdById,
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
