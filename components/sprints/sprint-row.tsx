"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Play, Pause, Trash2, Calendar } from "lucide-react";
import { toggleSprintActive, deleteSprint } from "@/lib/actions/sprint";
import { hasPermission, Permission } from "@/lib/permissions";
import { KanbanBoard } from "@/components/kanban-board";
import type { TaskCardData } from "@/components/tasks/task-card";

interface Column {
  status: string;
  label: string;
  color: string;
  tasks: TaskCardData[];
}

interface Sprint {
  id: string;
  title: string;
  startDate: Date | null;
  endDate: Date | null;
  isActive: boolean;
  totalTaskCount: number;
  _count: { tasks: number };
}

export function SprintRow({
  sprint,
  workspaceId,
  columns,
  columnCounts,
  columnPageSizes,
  columnFilters,
  permissions,
}: {
  sprint: Sprint;
  workspaceId: string;
  columns: Column[];
  columnCounts: Record<string, number>;
  columnPageSizes: Record<string, number>;
  columnFilters?: {
    q?: string;
    priorities?: string[];
    tagFilters?: string[];
    assigneeFilters?: string[];
    sprintId?: string;
  };
  permissions: number;
}) {
  const [, toggleAction, togglePending] = useActionState(
    toggleSprintActive,
    null,
  );
  const [, deleteAction, deletePending] = useActionState(deleteSprint, null);

  const canEdit = hasPermission(permissions, Permission.EDIT_CONTENT);
  const canDelete = hasPermission(permissions, Permission.DELETE_CONTENT);
  const canCreate = hasPermission(permissions, Permission.CREATE_CONTENT);

  const filteredCount =
    columnCounts.NOT_STARTED +
    columnCounts.IN_PROGRESS +
    columnCounts.IN_REVIEW +
    columnCounts.COMPLETED;

  // Timeline progress
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

  return (
    <div
      className={`rounded-md border bg-bg-elevated/60 backdrop-blur-sm ${
        sprint.isActive
          ? "border-border"
          : "border-dashed border-border opacity-60"
      }`}
    >
      {/* Sprint header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex-1">
          <div className="flex items-center gap-2.5">
            <Link
              href={`/dashboard/workspaces/${workspaceId}/sprints/${sprint.id}`}
              className="font-mono text-sm font-medium text-fg-primary transition-colors hover:text-accent"
            >
              {sprint.title}
            </Link>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                sprint.isActive
                  ? "bg-accent/10 text-accent"
                  : "bg-bg-secondary text-fg-muted"
              }`}
            >
              {sprint.isActive ? "Active" : "Closed"}
            </span>
            <span className="text-[11px] text-fg-muted">
              {sprint.totalTaskCount} task{sprint.totalTaskCount !== 1 && "s"}
              {columnFilters &&
                (columnFilters.q ||
                  (columnFilters.priorities?.length ?? 0) > 0 ||
                  (columnFilters.tagFilters?.length ?? 0) > 0 ||
                  (columnFilters.assigneeFilters?.length ?? 0) > 0) &&
                filteredCount !== sprint.totalTaskCount && (
                  <> · {filteredCount} matching</>
                )}
            </span>
          </div>

          {/* Timeline bar */}
          {sprint.startDate && sprint.endDate && (
            <div className="mt-1.5 flex items-center gap-2">
              <div className="flex items-center gap-1 text-[11px] text-fg-muted">
                <Calendar size={10} />
                {new Date(sprint.startDate).toLocaleDateString(undefined, {
                  timeZone: "UTC",
                })}{" "}
                –{" "}
                {new Date(sprint.endDate).toLocaleDateString(undefined, {
                  timeZone: "UTC",
                })}
              </div>
              <div className="flex-1">
                <div className="h-1.5 rounded-full bg-bg-secondary">
                  <div
                    className="h-1.5 rounded-full bg-accent/40 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              <span className="text-[11px] text-fg-muted">
                {Math.round(progress)}% elapsed
              </span>
            </div>
          )}
        </div>

        <div className="ml-4 flex items-center gap-1">
          {canEdit && (
            <form action={toggleAction}>
              <input type="hidden" name="sprintId" value={sprint.id} />
              <input type="hidden" name="workspaceId" value={workspaceId} />
              <button
                type="submit"
                disabled={togglePending}
                className="rounded p-1 text-fg-muted transition-colors hover:text-fg-secondary disabled:opacity-50"
                title={sprint.isActive ? "Close sprint" : "Reopen sprint"}
              >
                {sprint.isActive ? <Pause size={12} /> : <Play size={12} />}
              </button>
            </form>
          )}
          {canDelete && (
            <form action={deleteAction}>
              <input type="hidden" name="sprintId" value={sprint.id} />
              <input type="hidden" name="workspaceId" value={workspaceId} />
              <button
                type="submit"
                disabled={deletePending}
                className="rounded p-1 text-fg-muted transition-colors hover:text-accent-emphasis disabled:opacity-50"
                title="Delete sprint"
                onClick={(e) => {
                  if (
                    !confirm(
                      `Delete "${sprint.title}"? Tasks will be unassigned but not deleted.`,
                    )
                  ) {
                    e.preventDefault();
                  }
                }}
              >
                <Trash2 size={12} />
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Kanban columns */}
      <div className="p-2">
        <KanbanBoard
          columns={columns}
          boardId=""
          variant="simple"
          workspaceId={workspaceId}
          canCreate={canCreate && sprint.isActive}
          sprintId={sprint.id}
          columnCounts={columnCounts}
          columnPageSizes={columnPageSizes}
          columnFilters={columnFilters}
        />
      </div>
    </div>
  );
}
