import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, LayoutList } from "lucide-react";
import { TaskStatus } from "@/prisma/generated/prisma/enums";
import { BoardRow } from "./board-row";
import { BoardFilters } from "./board-filters";

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

export default async function BoardsPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<{
    showArchived?: string;
    q?: string;
    board?: string;
    status?: string;
    tag?: string;
  }>;
}) {
  const { workspaceId } = await params;
  const {
    showArchived,
    q,
    board: boardFilter,
    status: statusFilter,
    tag: tagFilter,
  } = await searchParams;
  const session = await auth();
  const userId = session!.user!.id!;

  const membership = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
    include: { role: true },
  });

  if (!membership) notFound();

  const includeArchived = showArchived === "true";

  // Build task filter
  const taskWhere: Record<string, unknown> = {};
  if (q) {
    taskWhere.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }
  if (statusFilter && STATUS_ORDER.includes(statusFilter as TaskStatus)) {
    taskWhere.status = statusFilter;
  }
  if (tagFilter) {
    taskWhere.tags = { some: { name: tagFilter } };
  }

  const hasTaskFilter = Object.keys(taskWhere).length > 0;

  // Board filter
  const boardWhere: Record<string, unknown> = { workspaceId };
  if (!includeArchived) boardWhere.isActive = true;
  if (boardFilter) boardWhere.id = boardFilter;

  const boards = await prisma.board.findMany({
    where: boardWhere,
    orderBy: { displayOrder: "asc" },
    include: {
      tasks: {
        where: hasTaskFilter ? taskWhere : {},
        orderBy: { createdAt: "desc" },
        include: {
          author: { select: { name: true } },
          assignees: { select: { id: true, name: true, image: true } },
          tags: { select: { name: true, color: true } },
        },
      },
      _count: { select: { tasks: true } },
    },
  });

  // Get all boards and tags for filter dropdowns
  const [allBoards, allTags, archivedCount] = await Promise.all([
    prisma.board.findMany({
      where: { workspaceId, isActive: true },
      select: { id: true, name: true },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.tag.findMany({
      where: { workspaceId },
      select: { name: true, color: true },
      orderBy: { name: "asc" },
    }),
    prisma.board.count({ where: { workspaceId, isActive: false } }),
  ]);

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
          <LayoutList size={16} className="text-accent" />
          <h1 className="font-mono text-lg font-semibold text-fg-primary">
            Boards
          </h1>
        </div>
        <Link
          href={`/dashboard/workspaces/${workspaceId}/boards/new`}
          className="flex items-center gap-1 rounded-md bg-accent/10 px-2.5 py-1.5 text-[11px] font-medium text-accent transition-colors hover:bg-accent/20"
        >
          <Plus size={11} />
          New Board
        </Link>
      </div>

      {/* Filters */}
      <div className="mt-4">
        <BoardFilters
          workspaceId={workspaceId}
          boards={allBoards}
          tags={allTags}
          currentQ={q}
          currentBoard={boardFilter}
          currentStatus={statusFilter}
          currentTag={tagFilter}
          showArchived={includeArchived}
          archivedCount={archivedCount}
        />
      </div>

      {/* Board rows */}
      <div className="mt-6">
        {boards.length === 0 ? (
          <p className="mt-8 text-center text-xs text-fg-muted">
            {hasTaskFilter || boardFilter
              ? "No results match your filters."
              : "No boards yet."}
          </p>
        ) : (
          <div className="space-y-3">
            {boards.map((board) => (
              <BoardRow
                key={board.id}
                board={board}
                workspaceId={workspaceId}
                statusOrder={STATUS_ORDER}
                statusLabels={STATUS_LABELS}
                statusColors={STATUS_COLORS}
                searchQuery={q}
                permissions={membership.role.permissions}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
