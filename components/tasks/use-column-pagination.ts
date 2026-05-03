"use client";

import { useState, useEffect, useCallback } from "react";
import { loadColumnTasks } from "@/lib/actions/task";
import type { TaskCardData } from "@/lib/types/task";
import type { SortOption } from "@/lib/task-enums";

const DEFAULT_PAGE_SIZE = 5;

interface Column {
  status: string;
  label: string;
  color: string;
  tasks: TaskCardData[];
}

interface ColumnPaginationState {
  page: number;
  isLoading: boolean;
  cache: Record<number, TaskCardData[]>;
}

interface UseColumnPaginationOptions {
  columns: Column[];
  effectiveCounts: Record<string, number>;
  effectivePageSizes: Record<string, number>;
  effectiveFilters:
    | {
        q?: string;
        priorities?: string[];
        tagFilters?: string[];
        assigneeFilters?: string[];
        sprintId?: string;
        assigneeUserId?: string;
        sorts?: SortOption[];
      }
    | undefined;
  boardId: string;
  workspaceId: string;
  loadPage?: (
    status: string,
    offset: number,
    limit: number,
  ) => Promise<TaskCardData[]>;
}

export function useColumnPagination({
  columns,
  effectiveCounts,
  effectivePageSizes,
  effectiveFilters,
  boardId,
  workspaceId,
  loadPage,
}: UseColumnPaginationOptions): {
  localColumns: Column[];
  paginationState: Record<string, ColumnPaginationState>;
  goToPage: (status: string, page: number) => Promise<void>;
  setLocalColumns: React.Dispatch<React.SetStateAction<Column[]>>;
} {
  const [localColumns, setLocalColumns] = useState(columns);

  const [paginationState, setPaginationState] = useState<
    Record<string, ColumnPaginationState>
  >(() => {
    const state: Record<string, ColumnPaginationState> = {};
    for (const col of columns) {
      const count = effectiveCounts[col.status];
      const pageSize = effectivePageSizes[col.status] ?? DEFAULT_PAGE_SIZE;
      if (count != null && count > pageSize) {
        state[col.status] = {
          page: 1,
          isLoading: false,
          cache: { 1: col.tasks },
        };
      }
    }
    return state;
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalColumns(columns);
    const newState: Record<string, ColumnPaginationState> = {};
    for (const col of columns) {
      const count = effectiveCounts[col.status];
      const pageSize = effectivePageSizes[col.status] ?? DEFAULT_PAGE_SIZE;
      if (count != null && count > pageSize) {
        newState[col.status] = {
          page: 1,
          isLoading: false,
          cache: { 1: col.tasks },
        };
      }
    }
    setPaginationState(newState);
  }, [columns, effectiveCounts, effectivePageSizes]);

  const goToPage = useCallback(
    async (status: string, page: number) => {
      const pageSize = effectivePageSizes[status] ?? DEFAULT_PAGE_SIZE;
      const count = effectiveCounts[status] ?? 0;
      const totalPages = Math.ceil(count / pageSize);
      const current = paginationState[status];
      if (!current) return;
      if (
        page < 1 ||
        page > totalPages ||
        page === current.page ||
        current.isLoading
      )
        return;

      if (current.cache[page]) {
        setLocalColumns((prev) =>
          prev.map((col) =>
            col.status === status
              ? { ...col, tasks: current.cache[page] }
              : col,
          ),
        );
        setPaginationState((prev) => ({
          ...prev,
          [status]: { ...prev[status], page },
        }));
        return;
      }

      setPaginationState((prev) => ({
        ...prev,
        [status]: { ...prev[status], isLoading: true },
      }));

      try {
        const offset = (page - 1) * pageSize;
        let mapped: TaskCardData[];
        if (loadPage) {
          mapped = await loadPage(status, offset, pageSize);
        } else {
          const tasks = await loadColumnTasks(
            boardId,
            workspaceId,
            status,
            offset,
            pageSize,
            effectiveFilters,
          );
          mapped = tasks as TaskCardData[];
        }
        setPaginationState((prev) => ({
          ...prev,
          [status]: {
            page,
            isLoading: false,
            cache: { ...prev[status].cache, [page]: mapped },
          },
        }));
        setLocalColumns((prev) =>
          prev.map((col) =>
            col.status === status ? { ...col, tasks: mapped } : col,
          ),
        );
      } catch {
        setPaginationState((prev) => ({
          ...prev,
          [status]: { ...prev[status], isLoading: false },
        }));
      }
    },
    [
      boardId,
      workspaceId,
      effectiveFilters,
      effectiveCounts,
      effectivePageSizes,
      paginationState,
      loadPage,
    ],
  );

  return { localColumns, paginationState, goToPage, setLocalColumns };
}
