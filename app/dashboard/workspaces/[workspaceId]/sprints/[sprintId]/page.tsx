import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar } from "lucide-react";
import {
  TaskPriority,
} from "@/prisma/generated/prisma/enums";
import { hasPermission, Permission } from "@/lib/permissions";
import {
  TASK_PRIORITIES,
  TASK_STATUSES as STATUS_ORDER,
  STATUS_LABELS,
  STATUS_COLORS,
} from "@/lib/task-enums";
import { SprintActions } from "./sprint-actions";
import { StandupModeFilter } from "./standup-mode-filter";
import { AssignTaskSection } from "./assign-task-section";
import { SprintViews } from "./sprint-views";
import { CollapsibleSection } from "@/components/collapsible-section";
import { TaskFilters } from "@/components/task-filters";

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
  }>;
}) {
  const { workspaceId, sprintId } = await params;
  const {
    q,
    priority: priorityParam,
    tag: tagParam,
    assignee: assigneeParam,
  } = await searchParams;
  const session = await auth();
  const userId = session!.user!.id!;

  const membership = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
    include: { role: true },
  });

  if (!membership) notFound();

  // Parse comma-separated multi-value params
  const priorities = parseMulti(priorityParam).filter((p) =>
    (TASK_PRIORITIES as readonly string[]).includes(p),
  );
  const tagFilters = parseMulti(tagParam);
  const assigneeFilters = parseMulti(assigneeParam);

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
    _count: { select: { comments: true } },
  } as const;

  const [sprint, totalTaskCount, tags, members] = await Promise.all([
    prisma.sprint.findUnique({
      where: { id: sprintId },
      include: {
        tasks: {
          where: hasTaskFilter ? taskWhere : undefined,
          orderBy: { createdAt: "desc" },
          include: taskInclude,
        },
      },
    }),
    // Always get total count for the sprint (unfiltered)
    prisma.task.count({
      where: { sprints: { some: { id: sprintId } } },
    }),
    prisma.tag.findMany({
      where: { workspaceId },
      select: { name: true, color: true },
      orderBy: { name: "asc" },
    }),
    prisma.workspaceMember.findMany({
      where: { workspaceId },
      select: {
        user: { select: { id: true, name: true, image: true } },
      },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  if (!sprint || sprint.workspaceId !== workspaceId) notFound();

  // For completion stats, we need unfiltered completed count
  // When filters are active, fetch separately
  let totalCompletedCount: number;
  if (hasTaskFilter) {
    totalCompletedCount = await prisma.task.count({
      where: {
        sprints: { some: { id: sprintId } },
        status: "COMPLETED",
      },
    });
  } else {
    totalCompletedCount = sprint.tasks.filter(
      (t) => t.status === "COMPLETED",
    ).length;
  }

  // Get unassigned tasks for the assign picker
  const [unassignedTasks, boards] = await Promise.all([
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

  const canEdit = hasPermission(
    membership.role.permissions,
    Permission.EDIT_CONTENT,
  );

  const columns = STATUS_ORDER.map((status) => ({
    status,
    label: STATUS_LABELS[status],
    color: STATUS_COLORS[status],
    tasks: sprint.tasks
      .filter((t) => t.status === status)
      .map((t) => ({ ...t, commentCount: t._count.comments })),
  }));

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

  const filteredCount = sprint.tasks.length;

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href={`/dashboard/workspaces/${workspaceId}/sprints`}
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
          permissions={membership.role.permissions}
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

      {/* Standup mode + Filters */}
      <div className="mt-4 space-y-4 rounded-md border border-border bg-bg-elevated/60 p-4 backdrop-blur-sm">
        <TaskFilters
          tags={tags}
          assignees={members.map((m) => m.user)}
          currentQ={q}
          currentPriorities={priorities}
          currentTags={tagFilters}
          currentAssignees={assigneeFilters}
        />

        <StandupModeFilter members={members.map((m) => m.user)} />
      </div>

      {/* Task views */}
      <div className="mt-6">
        <SprintViews
          columns={columns}
          tasks={sprint.tasks.map((t) => ({
            ...t,
            boardId: t.board.id,
            commentCount: t._count.comments,
          }))}
          sprintId={sprintId}
          sprintStart={sprint.startDate}
          sprintEnd={sprint.endDate}
          workspaceId={workspaceId}
          hasTimeline={!!sprint.startDate && !!sprint.endDate}
          boards={boards}
          canCreate={canEdit}
        />
      </div>
    </div>
  );
}
