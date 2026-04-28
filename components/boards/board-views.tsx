"use client";

import { useState } from "react";
import { Columns3, List } from "lucide-react";
import { KanbanBoard } from "@/components/kanban-board";
import { TaskListView } from "@/components/tasks/task-list-view";
import type { SortOption } from "@/lib/task-enums";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: Date | null;
  points?: number | null;
  assignees: { id: string; name: string | null; image?: string | null }[];
  tags?: { name: string; color: string | null }[];
  board?: { id: string; name: string };
  boardId?: string;
  commentCount?: number;
  subtaskIds?: string[];
  subtaskTotal?: number;
  subtaskCompleted?: number;
}

interface Column {
  status: string;
  label: string;
  color: string;
  tasks: Task[];
}

export function BoardViews({
  columns,
  allColumns,
  boardId,
  workspaceId,
  canCreate,
  sprints,
  members,
  tags,
  columnCounts,
  columnPageSizes,
  columnFilters,
}: {
  columns: Column[];
  allColumns?: Column[];
  boardId: string;
  workspaceId: string;
  canCreate: boolean;
  sprints?: { id: string; title: string }[];
  members?: { id: string; name: string | null; email?: string | null; image?: string | null }[];
  tags?: { id: string; name: string; color: string | null }[];
  columnCounts?: Record<string, number>;
  columnPageSizes?: Record<string, number>;
  columnFilters?: {
    q?: string;
    priorities?: string[];
    tagFilters?: string[];
    assigneeFilters?: string[];
    sorts?: SortOption[];
  };
}) {
  const [view, setView] = useState<"columns" | "list">("columns");

  return (
    <div>
      {/* View toggle */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-md border border-border bg-bg-secondary/50 p-0.5">
          <button
            onClick={() => setView("columns")}
            className={`flex cursor-pointer items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
              view === "columns"
                ? "bg-bg-elevated text-fg-primary shadow-sm"
                : "text-fg-muted hover:text-fg-secondary"
            }`}
          >
            <Columns3 size={13} />
            Columns
          </button>
          <button
            onClick={() => setView("list")}
            className={`flex cursor-pointer items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
              view === "list"
                ? "bg-bg-elevated text-fg-primary shadow-sm"
                : "text-fg-muted hover:text-fg-secondary"
            }`}
          >
            <List size={13} />
            List
          </button>
        </div>
      </div>

      {view === "list" ? (
        <TaskListView
          columns={allColumns ?? columns}
          workspaceId={workspaceId}
          boardId={boardId}
        />
      ) : (
        <KanbanBoard
          columns={columns}
          boardId={boardId}
          variant="detailed"
          workspaceId={workspaceId}
          canCreate={canCreate}
          sprints={sprints}
          members={members}
          tags={tags}
          columnCounts={columnCounts}
          columnPageSizes={columnPageSizes}
          columnFilters={columnFilters}
        />
      )}
    </div>
  );
}
