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

export function DashboardKanban({
  columns,
  columnCounts,
  columnPageSizes,
}: {
  columns: Column[];
  columnCounts: Record<string, number>;
  columnPageSizes: Record<string, number>;
}) {
  const loadPage = useCallback(
    async (status: string, offset: number, limit: number) => {
      const tasks = await loadMyColumnTasks(status, offset, limit);
      return tasks as TaskCardData[];
    },
    [],
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
