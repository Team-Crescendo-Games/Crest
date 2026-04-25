import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar } from "lucide-react";
import {
  TaskStatus,
  TaskPriority,
} from "@/prisma/generated/prisma/enums";
import { hasPermission, Permission } from "@/lib/permissions";
import { BoardActions } from "./board-actions";
import { TaskFilters } from "../../../../../../components/task-filters";
import { KanbanBoard } from "@/components/kanban-board";
import {
  TASK_PRIORITIES,
  TASK_STATUSES as STATUS_ORDER,
  STATUS_LABELS,
  STATUS_COLORS,
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
  }>;
}) {
  const { workspaceId, boardId } = await params;
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

  const [board, totalTaskCount, tags, members, sprints] = await Promise.all([
    prisma.board.findUnique({
      where: { id: boardId },
      include: {
        tasks: {
          where: taskWhere,
          orderBy: { createdAt: "desc" },
          include: {
            author: { select: { name: true } },
            assignees: { select: { id: true, name: true, image: true } },
            tags: { select: { name: true, color: true } },
            _count: { select: { comments: true } },
          },
        },
      },
    }),
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

  if (!board || board.workspaceId !== workspaceId) notFound();

  const canCreate = hasPermission(
    membership.role.permissions,
    Permission.CREATE_CONTENT,
  );

  const columns = STATUS_ORDER.map((status) => ({
    status,
    label: STATUS_LABELS[status],
    color: STATUS_COLORS[status],
    tasks: board.tasks
      .filter((t) => t.status === status)
      .map((t) => ({ ...t, commentCount: t._count.comments })),
  }));

  const hasFilters =
    !!q ||
    priorities.length > 0 ||
    tagFilters.length > 0 ||
    assigneeFilters.length > 0;
  const filteredCount = board.tasks.length;

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href={`/dashboard/workspaces/${workspaceId}/boards`}
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
                {totalTaskCount} task{totalTaskCount !== 1 && "s"}
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
          permissions={membership.role.permissions}
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
        />

        <KanbanBoard
          columns={columns}
          boardId={boardId}
          variant="detailed"
          workspaceId={workspaceId}
          canCreate={canCreate}
          sprints={sprints}
          members={members.map((m) => m.user)}
          tags={tags}
        />
      </div>
    </div>
  );
}
