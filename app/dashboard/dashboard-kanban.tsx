"use client";

import { useCallback } from "react";
import { KanbanBoard } from "@/components/kanban-board";
import { loadMyColumnTasks } from "@/lib/actions/task";
import type { TaskCardData } from "@/components/task-card";

interface Column {
  status: string;
  label: string;
  color: string;
  tasks: TaskCardData[];
}

export interface DashboardFilters {
  q?: string;
  priorities?: string[];
  tagFilters?: string[];
  workspaceIds?: string[];
  boardIds?: string[];
}

export function DashboardKanban({
  columns,
  columnCounts,
  columnPageSizes,
  filters,
}: {
  columns: Column[];
  columnCounts: Record<string, number>;
  columnPageSizes: Record<string, number>;
  filters?: DashboardFilters;
}) {
  const loadPage = useCallback(
    async (status: string, offset: number, limit: number) => {
      const tasks = await loadMyColumnTasks(status, offset, limit, filters);
      return tasks as TaskCardData[];
    },
    [filters],
  );

  return (
    <KanbanBoard
      columns={columns}
      boardId=""
      workspaceId=""
      canCreate={false}
      variant="detailed"
      columnCounts={columnCounts}
      columnPageSizes={columnPageSizes}
      loadPage={loadPage}
    />
  );
}
