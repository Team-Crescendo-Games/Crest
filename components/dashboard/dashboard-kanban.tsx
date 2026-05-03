"use client";

import { useCallback } from "react";
import { KanbanBoard } from "@/components/tasks/kanban-board";
import { loadMyColumnTasks } from "@/lib/actions/task";
import { DashboardCreateTask } from "./dashboard-create-task";
import type { TaskCardData } from "@/lib/types/task";
import type { SortOption } from "@/lib/task-enums";

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
  sorts?: SortOption[];
}

interface WorkspaceOption {
  id: string;
  name: string;
  boards: { id: string; name: string }[];
}

export function DashboardKanban({
  columns,
  columnCounts,
  columnPageSizes,
  filters,
  workspaces,
}: {
  columns: Column[];
  columnCounts: Record<string, number>;
  columnPageSizes: Record<string, number>;
  filters?: DashboardFilters;
  workspaces?: WorkspaceOption[];
}) {
  const loadPage = useCallback(
    async (status: string, offset: number, limit: number) => {
      const tasks = await loadMyColumnTasks(status, offset, limit, filters);
      return tasks as TaskCardData[];
    },
    [filters],
  );

  const renderCreateButton =
    workspaces && workspaces.length > 0
      ? (status: string) => <DashboardCreateTask workspaces={workspaces} defaultStatus={status} compact />
      : undefined;

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
      renderCreateButton={renderCreateButton}
    />
  );
}
