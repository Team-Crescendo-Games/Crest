import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar } from "lucide-react";
import { TaskStatus } from "@/prisma/generated/prisma/enums";
import { hasPermission, Permission } from "@/lib/permissions";
import { BoardActions } from "./board-actions";
import { KanbanBoard } from "@/components/kanban-board";

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

export default async function BoardDetailPage({
  params,
}: {
  params: Promise<{ workspaceId: string; boardId: string }>;
}) {
  const { workspaceId, boardId } = await params;
  const session = await auth();
  const userId = session!.user!.id!;

  const membership = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
    include: { role: true },
  });

  if (!membership) notFound();

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: {
      tasks: {
        orderBy: { createdAt: "desc" },
        include: {
          author: { select: { name: true } },
          assignees: { select: { id: true, name: true, image: true } },
          tags: { select: { name: true, color: true } },
        },
      },
    },
  });

  if (!board || board.workspaceId !== workspaceId) notFound();

  const canCreate = hasPermission(
    membership.role.permissions,
    Permission.CREATE_CONTENT,
  );

  const columns = STATUS_ORDER.map((status) => ({
    status,
    label: STATUS_LABELS[status],
    color: STATUS_COLORS[status],
    tasks: board.tasks.filter((t) => t.status === status),
  }));

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
            {board.tasks.length} task{board.tasks.length !== 1 && "s"}
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

      <div className="mt-6">
        <KanbanBoard
          columns={columns}
          boardId={boardId}
          variant="detailed"
          workspaceId={workspaceId}
          canCreate={canCreate}
        />
      </div>
    </div>
  );
}
