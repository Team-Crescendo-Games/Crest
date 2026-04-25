import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Pencil } from "lucide-react";
import { TaskStatus } from "@/prisma/generated/prisma/enums";
import { hasPermission, Permission } from "@/lib/permissions";
import { KanbanBoard } from "@/components/kanban-board";
import { SprintActions } from "./sprint-actions";
import { AssignTaskSection } from "./assign-task-section";
import { SprintViews } from "./sprint-views";

const STATUS_ORDER: TaskStatus[] = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "IN_REVIEW",
  "COMPLETED",
];

const STATUS_LABELS: Record<TaskStatus, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  COMPLETED: "Completed",
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  NOT_STARTED: "#9c9c98",
  IN_PROGRESS: "#f1c258",
  IN_REVIEW: "#f0a468",
  COMPLETED: "#6bc96b",
};

export default async function SprintDetailPage({
  params,
}: {
  params: Promise<{ workspaceId: string; sprintId: string }>;
}) {
  const { workspaceId, sprintId } = await params;
  const session = await auth();
  const userId = session!.user!.id!;

  const membership = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
    include: { role: true },
  });

  if (!membership) notFound();

  const sprint = await prisma.sprint.findUnique({
    where: { id: sprintId },
    include: {
      tasks: {
        orderBy: { createdAt: "desc" },
        include: {
          author: { select: { name: true } },
          assignees: { select: { id: true, name: true, image: true } },
          tags: { select: { name: true, color: true } },
          board: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!sprint || sprint.workspaceId !== workspaceId) notFound();

  // Get unassigned tasks for the assign picker
  const unassignedTasks = await prisma.task.findMany({
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
  });

  const canEdit = hasPermission(
    membership.role.permissions,
    Permission.EDIT_CONTENT,
  );

  const columns = STATUS_ORDER.map((status) => ({
    status,
    label: STATUS_LABELS[status],
    color: STATUS_COLORS[status],
    tasks: sprint.tasks.filter((t) => t.status === status),
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

  const completedCount =
    columns.find((c) => c.status === "COMPLETED")?.tasks.length ?? 0;
  const taskCompletion =
    sprint.tasks.length > 0
      ? Math.round((completedCount / sprint.tasks.length) * 100)
      : 0;

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
              {sprint.tasks.length} task
              {sprint.tasks.length !== 1 && "s"} · {taskCompletion}% done
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
        <div className="mt-4 rounded-md border border-border bg-bg-elevated/60 p-4 backdrop-blur-sm">
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
              {completedCount}/{sprint.tasks.length}
            </span>
          </div>
        </div>
      )}

      {/* Assign tasks */}
      {canEdit && (
        <div className="mt-6">
          <AssignTaskSection
            sprintId={sprintId}
            workspaceId={workspaceId}
            assignedTaskIds={sprint.tasks.map((t) => t.id)}
            unassignedTasks={unassignedTasks}
          />
        </div>
      )}

      {/* Task views (columns / timeline) */}
      <div className="mt-6">
        <SprintViews
          columns={columns}
          tasks={sprint.tasks.map((t) => ({
            ...t,
            boardId: t.board.id,
          }))}
          sprintStart={sprint.startDate}
          sprintEnd={sprint.endDate}
          workspaceId={workspaceId}
          hasTimeline={!!sprint.startDate && !!sprint.endDate}
        />
      </div>
    </div>
  );
}
