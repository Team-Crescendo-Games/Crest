"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Archive, ArchiveRestore, Trash2, Settings } from "lucide-react";
import { archiveBoard, deleteBoard } from "@/lib/actions/board";
import { hasPermission, Permission } from "@/lib/permissions";
import { KanbanBoard } from "@/components/kanban-board";
import type { TaskCardData } from "@/components/task-card";

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
  const [, archiveAction, archivePending] = useActionState(archiveBoard, null);
  const [, deleteAction, deletePending] = useActionState(deleteBoard, null);

  const canEdit = hasPermission(permissions, Permission.EDIT_CONTENT);
  const canDelete = hasPermission(permissions, Permission.DELETE_CONTENT);
  const canCreate = hasPermission(permissions, Permission.CREATE_CONTENT);

  const filteredCount =
    columnCounts.NOT_STARTED +
    columnCounts.IN_PROGRESS +
    columnCounts.IN_REVIEW +
    columnCounts.COMPLETED;

  return (
    <div
      className={`rounded-md border bg-bg-elevated/60 backdrop-blur-sm ${
        board.isActive
          ? "border-border"
          : "border-dashed border-border opacity-60"
      }`}
    >
      {/* Board header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <Link
            href={`/dashboard/workspaces/${workspaceId}/boards/${board.id}`}
            className="font-mono text-sm font-medium text-fg-primary transition-colors hover:text-accent"
          >
            {board.name}
          </Link>
          {!board.isActive && (
            <span className="rounded bg-bg-secondary px-1.5 py-0.5 text-[11px] text-fg-muted">
              Archived
            </span>
          )}
          <span className="text-[11px] text-fg-muted">
            {board.totalTaskCount} task{board.totalTaskCount !== 1 && "s"}
            {searchQuery && filteredCount !== board.totalTaskCount && (
              <> · {filteredCount} matching</>
            )}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {canEdit && (
            <Link
              href={`/dashboard/workspaces/${workspaceId}/boards/${board.id}`}
              className="rounded p-1 text-fg-muted transition-colors hover:text-fg-secondary"
              title="Board details"
            >
              <Settings size={12} />
            </Link>
          )}
          {canEdit && (
            <form action={archiveAction}>
              <input type="hidden" name="boardId" value={board.id} />
              <input type="hidden" name="workspaceId" value={workspaceId} />
              <button
                type="submit"
                disabled={archivePending}
                onClick={(e) => {
                  if (
                    board.isActive &&
                    !confirm(
                      `Archive "${board.name}"? The board and its tasks will be hidden from the sidebar and active boards list until you restore it.`,
                    )
                  ) {
                    e.preventDefault();
                  }
                }}
                className="rounded p-1 text-fg-muted transition-colors hover:text-fg-secondary disabled:opacity-50"
                title={board.isActive ? "Archive" : "Unarchive"}
              >
                {board.isActive ? (
                  <Archive size={12} />
                ) : (
                  <ArchiveRestore size={12} />
                )}
              </button>
            </form>
          )}
          {canDelete && (
            <form action={deleteAction}>
              <input type="hidden" name="boardId" value={board.id} />
              <input type="hidden" name="workspaceId" value={workspaceId} />
              <button
                type="submit"
                disabled={deletePending}
                className="rounded p-1 text-fg-muted transition-colors hover:text-accent-emphasis disabled:opacity-50"
                title="Delete board"
                onClick={(e) => {
                  if (
                    !confirm(
                      `Delete "${board.name}"? All tasks will be permanently deleted.`,
                    )
                  )
                    e.preventDefault();
                }}
              >
                <Trash2 size={12} />
              </button>
            </form>
          )}
        </div>
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
