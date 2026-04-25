"use client";

import { useState } from "react";
import { Columns3, GanttChart } from "lucide-react";
import { KanbanBoard } from "@/components/kanban-board";
import { SprintTimeline } from "@/components/sprint-timeline";
import type { TaskStatus, TaskPriority } from "@/prisma/generated/prisma/enums";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  startDate: Date | null;
  dueDate: Date | null;
  boardId: string;
  author: { name: string | null };
  assignees: { id: string; name: string | null }[];
  tags: { name: string; color: string | null }[];
  board: { id: string; name: string };
  parentTaskId?: string | null;
  subtaskIds?: string[];
}

interface Column {
  status: TaskStatus;
  label: string;
  color: string;
  tasks: Task[];
}

export function SprintViews({
  columns,
  tasks,
  sprintId,
  sprintStart,
  sprintEnd,
  workspaceId,
  hasTimeline,
  boards,
  canCreate,
  members,
  tags,
  columnCounts,
  columnPageSizes,
  columnFilters,
}: {
  columns: Column[];
  tasks: Task[];
  sprintId: string;
  sprintStart: Date | null;
  sprintEnd: Date | null;
  workspaceId: string;
  hasTimeline: boolean;
  boards: { id: string; name: string }[];
  canCreate: boolean;
  members?: { id: string; name: string | null; email?: string | null; image?: string | null }[];
  tags?: { id: string; name: string; color: string | null }[];
  columnCounts?: Record<string, number>;
  columnPageSizes?: Record<string, number>;
  columnFilters?: {
    q?: string;
    priorities?: string[];
    tagFilters?: string[];
    assigneeFilters?: string[];
    sprintId?: string;
    assigneeUserId?: string;
  };
}) {
  const [view, setView] = useState<"columns" | "timeline">("columns");

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
          <div className="relative group/timeline">
            <button
              onClick={() => hasTimeline && setView("timeline")}
              className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                !hasTimeline
                  ? "cursor-not-allowed opacity-40"
                  : view === "timeline"
                    ? "cursor-pointer bg-bg-elevated text-fg-primary shadow-sm"
                    : "cursor-pointer text-fg-muted hover:text-fg-secondary"
              }`}
            >
              <GanttChart size={13} />
              Timeline
            </button>
            {!hasTimeline && (
              <div className="pointer-events-none absolute left-1/2 top-full z-10 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-bg-primary px-2 py-1 text-[10px] text-fg-muted opacity-0 shadow-md border border-border transition-opacity group-hover/timeline:opacity-100">
                The Sprint does not have a Start/End date set
              </div>
            )}
          </div>
        </div>
      </div>

      {view === "timeline" && hasTimeline ? (
        <SprintTimeline
          tasks={tasks}
          sprintStart={sprintStart!}
          sprintEnd={sprintEnd!}
          workspaceId={workspaceId}
        />
      ) : (
        <KanbanBoard
          columns={columns}
          boardId=""
          variant="detailed"
          workspaceId={workspaceId}
          canCreate={canCreate}
          boards={boards}
          sprintId={sprintId}
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
