"use client";

import Link from "next/link";
import { hasPermission, Permission } from "@/lib/permissions";
import { KanbanBoard } from "@/components/tasks/kanban-board";
import type { TaskCardData } from "@/lib/types/task";

interface Column {
  status: string;
  label: string;
  color: string;
  tasks: TaskCardData[];
}

interface Board {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  totalTaskCount: number;
}

export function BoardRow({
  board,
  workspaceId,
  columns,
  columnCounts,
  columnPageSizes,
  columnFilters,
  searchQuery,
  permissions,
}: {
  board: Board;
  workspaceId: string;
  columns: Column[];
  columnCounts: Record<string, number>;
  columnPageSizes: Record<string, number>;
  columnFilters?: {
    q?: string;
    priorities?: string[];
    tagFilters?: string[];
    assigneeFilters?: string[];
  };
  searchQuery?: string;
  permissions: number;
}) {
  const canCreate = hasPermission(permissions, Permission.CREATE_CONTENT);

  const filteredCount =
    columnCounts.NOT_STARTED + columnCounts.IN_PROGRESS + columnCounts.IN_REVIEW + columnCounts.COMPLETED;

  return (
    <div
      className={`rounded-md border bg-bg-elevated/60 backdrop-blur-sm ${
        board.isActive ? "border-border" : "border-dashed border-border opacity-60"
      }`}
    >
      {/* Board header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <Link
            href={`/w/${workspaceId}/b/${board.id}`}
            className="font-mono text-sm font-medium text-fg-primary transition-colors hover:text-accent"
          >
            {board.name}
          </Link>
          {!board.isActive && (
            <span className="rounded bg-bg-secondary px-1.5 py-0.5 text-[11px] text-fg-muted">Archived</span>
          )}
          <span className="text-[11px] text-fg-muted">
            {board.totalTaskCount} task{board.totalTaskCount !== 1 && "s"}
            {searchQuery && filteredCount !== board.totalTaskCount && <> · {filteredCount} matching</>}
          </span>
        </div>
        <div className="flex items-center gap-1"></div>
      </div>

      {/* Kanban columns with pagination */}
      <div className="p-2">
        <KanbanBoard
          columns={columns}
          boardId={board.id}
          variant="simple"
          workspaceId={workspaceId}
          canCreate={canCreate && board.isActive}
          columnCounts={columnCounts}
          columnPageSizes={columnPageSizes}
          columnFilters={columnFilters}
        />
      </div>
    </div>
  );
}
