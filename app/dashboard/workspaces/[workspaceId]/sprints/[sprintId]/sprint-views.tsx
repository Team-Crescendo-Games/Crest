"use client";

import { useState } from "react";
import { Columns3, GanttChart } from "lucide-react";
import { KanbanBoard } from "@/components/kanban-board";
import { SprintTimeline } from "@/components/sprint-timeline";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  startDate: Date | null;
  dueDate: Date | null;
  boardId: string;
  author: { name: string | null };
  assignees: { id: string; name: string | null }[];
  tags: { name: string; color: string | null }[];
  board: { id: string; name: string };
}

interface Column {
  status: string;
  label: string;
  color: string;
  tasks: Task[];
}

export function SprintViews({
  columns,
  tasks,
  sprintStart,
  sprintEnd,
  workspaceId,
  hasTimeline,
}: {
  columns: Column[];
  tasks: Task[];
  sprintStart: Date | null;
  sprintEnd: Date | null;
  workspaceId: string;
  hasTimeline: boolean;
}) {
  const [view, setView] = useState<"columns" | "timeline">("columns");

  return (
    <div>
      {/* View toggle */}
      {hasTimeline && (
        <div className="mb-4 flex items-center gap-1 rounded-md border border-border bg-bg-secondary/50 p-0.5 w-fit">
          <button
            onClick={() => setView("columns")}
            className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
              view === "columns"
                ? "bg-bg-elevated text-fg-primary shadow-sm"
                : "text-fg-muted hover:text-fg-secondary"
            }`}
          >
            <Columns3 size={13} />
            Columns
          </button>
          <button
            onClick={() => setView("timeline")}
            className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
              view === "timeline"
                ? "bg-bg-elevated text-fg-primary shadow-sm"
                : "text-fg-muted hover:text-fg-secondary"
            }`}
          >
            <GanttChart size={13} />
            Timeline
          </button>
        </div>
      )}

      {view === "columns" || !hasTimeline ? (
        <KanbanBoard
          columns={columns}
          boardId=""
          variant="detailed"
          workspaceId={workspaceId}
          canCreate={false}
        />
      ) : (
        <SprintTimeline
          tasks={tasks}
          sprintStart={sprintStart!}
          sprintEnd={sprintEnd!}
          workspaceId={workspaceId}
        />
      )}
    </div>
  );
}
