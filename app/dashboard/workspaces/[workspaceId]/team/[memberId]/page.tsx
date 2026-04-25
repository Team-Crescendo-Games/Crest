import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  TaskPriority,
  TaskStatus,
} from "@/prisma/generated/prisma/enums";
import {
  TASK_PRIORITIES,
  TASK_STATUSES as STATUS_ORDER,
  STATUS_LABELS,
  STATUS_COLORS,
} from "@/lib/task-enums";
import { KanbanBoard } from "@/components/kanban-board";
import { UserAvatar } from "@/components/user-avatar";
import { TaskFilters } from "@/components/task-filters";

/** Split a comma-separated param into a trimmed, non-empty array. */
function parseMulti(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export default async function MemberTasksPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string; memberId: string }>;
  searchParams: Promise<{
    q?: string;
    priority?: string;
    tag?: string;
  }>;
}) {
  const { workspaceId, memberId } = await params;
  const { q, priority: priorityParam, tag: tagParam } = await searchParams;
  const session = await auth();
  const userId = session!.user!.id!;

  // Verify the current user is a member of this workspace
  const currentMembership = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });
  if (!currentMembership) notFound();

  // Fetch the target member
  const member = await prisma.workspaceMember.findUnique({
    where: { id: memberId },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
      role: { select: { name: true, color: true } },
    },
  });

  if (!member || member.workspaceId !== workspaceId) notFound();

  // Parse filter params
  const priorities = parseMulti(priorityParam).filter((p) =>
    (TASK_PRIORITIES as readonly string[]).includes(p),
  );
  const tagFilters = parseMulti(tagParam);

  // Build task where-clause
  const taskWhere: Record<string, unknown> = {
    assignees: { some: { id: member.user.id } },
    board: { workspaceId },
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

  // Page sizes per column type
  const PAGE_SIZE_DEFAULT = 20;
  const PAGE_SIZE_COMPLETED = 10;

  const taskInclude = {
    assignees: { select: { id: true, name: true, image: true } },
    tags: { select: { name: true, color: true } },
    board: { select: { id: true, name: true } },
    subtasks: { select: { id: true, status: true } },
    _count: { select: { comments: true } },
  } as const;

  // Build per-status where clauses for assignee-scoped tasks
  const statusWhere = (status: TaskStatus) => ({
    ...taskWhere,
    status,
  });

  // Fetch tasks assigned to this member within this workspace, paginated per status
  const [
    notStartedTasks, notStartedCount,
    inProgressTasks, inProgressCount,
    inReviewTasks, inReviewCount,
    completedTasksList, completedCountVal,
    boards, sprints, allMembers, allTags,
  ] = await Promise.all([
    prisma.task.findMany({ where: statusWhere("NOT_STARTED" as TaskStatus), orderBy: { createdAt: "desc" }, take: PAGE_SIZE_DEFAULT, include: taskInclude }),
    prisma.task.count({ where: statusWhere("NOT_STARTED" as TaskStatus) }),
    prisma.task.findMany({ where: statusWhere("IN_PROGRESS" as TaskStatus), orderBy: { createdAt: "desc" }, take: PAGE_SIZE_DEFAULT, include: taskInclude }),
    prisma.task.count({ where: statusWhere("IN_PROGRESS" as TaskStatus) }),
    prisma.task.findMany({ where: statusWhere("IN_REVIEW" as TaskStatus), orderBy: { createdAt: "desc" }, take: PAGE_SIZE_DEFAULT, include: taskInclude }),
    prisma.task.count({ where: statusWhere("IN_REVIEW" as TaskStatus) }),
    prisma.task.findMany({ where: statusWhere("COMPLETED" as TaskStatus), orderBy: { createdAt: "desc" }, take: PAGE_SIZE_COMPLETED, include: taskInclude }),
    prisma.task.count({ where: statusWhere("COMPLETED" as TaskStatus) }),
    prisma.board.findMany({
      where: { workspaceId, isActive: true },
      select: { id: true, name: true },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.sprint.findMany({
      where: { workspaceId, isActive: true },
      select: { id: true, title: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.workspaceMember.findMany({
      where: { workspaceId },
      select: { user: { select: { id: true, name: true, email: true, image: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.tag.findMany({
      where: { workspaceId },
      select: { id: true, name: true, color: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const totalAssigned = notStartedCount + inProgressCount + inReviewCount + completedCountVal;
  const completedTasks = completedCountVal;

  // Use a typed helper to get the correct Prisma return type with includes
  type TaskWithIncludes = Awaited<ReturnType<typeof prisma.task.findMany<{ include: typeof taskInclude }>>>[number];

  const allPagedTasks = [
    ...notStartedTasks as TaskWithIncludes[],
    ...inProgressTasks as TaskWithIncludes[],
    ...inReviewTasks as TaskWithIncludes[],
    ...completedTasksList as TaskWithIncludes[],
  ];
  const totalPoints = allPagedTasks.reduce((sum, t) => sum + (t.points ?? 0), 0);

  const mapTask = (t: TaskWithIncludes) => ({
    ...t,
    boardId: t.board.id,
    commentCount: t._count.comments,
    subtaskTotal: t.subtasks.length,
    subtaskCompleted: t.subtasks.filter((s: { status: string }) => s.status === "COMPLETED").length,
  });

  const tasksByStatus: Record<string, ReturnType<typeof mapTask>[]> = {
    NOT_STARTED: (notStartedTasks as TaskWithIncludes[]).map(mapTask),
    IN_PROGRESS: (inProgressTasks as TaskWithIncludes[]).map(mapTask),
    IN_REVIEW: (inReviewTasks as TaskWithIncludes[]).map(mapTask),
    COMPLETED: (completedTasksList as TaskWithIncludes[]).map(mapTask),
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
    COMPLETED: completedCountVal,
  };

  const columnPageSizes: Record<string, number> = {
    NOT_STARTED: PAGE_SIZE_DEFAULT,
    IN_PROGRESS: PAGE_SIZE_DEFAULT,
    IN_REVIEW: PAGE_SIZE_DEFAULT,
    COMPLETED: PAGE_SIZE_COMPLETED,
  };

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href={`/dashboard/workspaces/${workspaceId}/team`}
        className="mb-6 inline-flex items-center gap-1.5 text-xs text-fg-muted transition-colors hover:text-fg-secondary"
      >
        <ArrowLeft size={12} />
        Back to team
      </Link>

      {/* Member header */}
      <div className="flex items-center gap-4">
        <UserAvatar
          name={member.user.name}
          image={member.user.image}
          size={48}
        />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-mono text-lg font-semibold text-fg-primary">
              {member.user.name}
            </h1>
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{
                backgroundColor: member.role.color + "20",
                color: member.role.color,
              }}
            >
              {member.role.name}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-fg-muted">{member.user.email}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        <StatCard label="Assigned" value={totalAssigned} barColor="#f0a468" />
        <StatCard label="Completed" value={completedTasks} barColor="#6bc96b" />
        <StatCard label="Points" value={totalPoints} barColor="#9c9c98" />
      </div>

      {/* Tasks kanban */}
      <div className="mt-8">
        <h2 className="font-mono text-sm font-medium text-fg-primary">
          Tasks
        </h2>
        <div className="mt-1 h-px w-8 bg-accent-subtle" />

        <div className="mt-4">
          <TaskFilters
            tags={allTags}
            assignees={[]}
            currentQ={q}
            currentPriorities={priorities}
            currentTags={tagFilters}
            currentAssignees={[]}
          />
        </div>

        <div className="mt-4">
          {totalAssigned === 0 ? (
            <p className="py-8 text-center text-xs text-fg-muted">
              No tasks assigned to {member.user.name} in this workspace.
            </p>
          ) : (
            <KanbanBoard
              columns={columns}
              boardId=""
              workspaceId={workspaceId}
              canCreate={boards.length > 0}
              variant="detailed"
              boards={boards}
              assigneeId={member.user.id}
              sprints={sprints}
              members={allMembers.map((m) => m.user)}
              tags={allTags}
              columnCounts={columnCounts}
              columnPageSizes={columnPageSizes}
              columnFilters={{
                q,
                priorities,
                tagFilters,
                assigneeUserId: member.user.id,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  barColor,
}: {
  label: string;
  value: number;
  barColor: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-md border border-border bg-bg-elevated/60 backdrop-blur-sm">
      <div
        className="absolute left-0 top-0 h-full w-1"
        style={{ backgroundColor: barColor }}
      />
      <div className="p-4 pl-5">
        <p className="text-[11px] font-medium uppercase tracking-wider text-fg-muted">
          {label}
        </p>
        <p className="mt-1.5 font-mono text-2xl font-semibold text-fg-primary">
          {value}
        </p>
      </div>
    </div>
  );
}
