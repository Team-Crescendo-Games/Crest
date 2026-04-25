"use client";

import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { useState, useTransition, useEffect, useCallback, useMemo } from "react";
import { updateTaskStatus, loadColumnTasks } from "@/lib/actions/task";
import { CreateTaskForm } from "@/components/create-task-form";
import { TaskCard, type TaskCardData } from "@/components/task-card";
import { ChevronLeft, ChevronRight } from "lucide-react";

const DEFAULT_PAGE_SIZE = 20;

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

export function KanbanBoard({
  columns,
  boardId,
  workspaceId,
  canCreate,
  variant = "simple",
  boards,
  assigneeId,
  sprintId,
  sprints,
  members,
  tags,
  columnCounts,
  columnPageSizes,
  columnFilters,
  // Legacy props for backward compatibility
  completedCount,
  completedFilters,
}: {
  columns: Column[];
  boardId: string;
  workspaceId: string;
  canCreate: boolean;
  variant?: "simple" | "detailed";
  boards?: { id: string; name: string }[];
  assigneeId?: string;
  sprintId?: string;
  sprints?: { id: string; title: string }[];
  members?: { id: string; name: string | null; email?: string | null; image?: string | null }[];
  tags?: { id: string; name: string; color: string | null }[];
  /** Total task count per status (e.g. { NOT_STARTED: 45, COMPLETED: 120 }) */
  columnCounts?: Record<string, number>;
  /** Page size per status (e.g. { NOT_STARTED: 20, COMPLETED: 10 }) */
  columnPageSizes?: Record<string, number>;
  /** Filters to pass when loading paginated tasks */
  columnFilters?: {
    q?: string;
    priorities?: string[];
    tagFilters?: string[];
    assigneeFilters?: string[];
    sprintId?: string;
    assigneeUserId?: string;
  };
  /** @deprecated Use columnCounts instead */
  completedCount?: number;
  /** @deprecated Use columnFilters instead */
  completedFilters?: {
    q?: string;
    priorities?: string[];
    tagFilters?: string[];
    assigneeFilters?: string[];
  };
}) {
  const [isPending, startTransition] = useTransition();
  const [localColumns, setLocalColumns] = useState(columns);

  // Normalize: merge legacy props into the new per-column maps
  const effectiveCounts = useMemo(() => {
    if (columnCounts) return columnCounts;
    if (completedCount != null) return { COMPLETED: completedCount };
    return {};
  }, [columnCounts, completedCount]);

  const effectivePageSizes = useMemo(() => {
    if (columnPageSizes) return columnPageSizes;
    if (completedCount != null) return { COMPLETED: 10 };
    return {};
  }, [columnPageSizes, completedCount]);

  const effectiveFilters = columnFilters ?? completedFilters;

  // Per-column pagination state
  const [paginationState, setPaginationState] = useState<Record<string, ColumnPaginationState>>(() => {
    const state: Record<string, ColumnPaginationState> = {};
    for (const col of columns) {
      const count = effectiveCounts[col.status];
      const pageSize = effectivePageSizes[col.status] ?? DEFAULT_PAGE_SIZE;
      if (count != null && count > pageSize) {
        state[col.status] = { page: 1, isLoading: false, cache: { 1: col.tasks } };
      }
    }
    return state;
  });

  // Track which task is hovered to highlight its subtasks
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);

  // Build a set of subtask IDs for the currently hovered task
  const highlightedIds = useMemo(() => {
    if (!hoveredTaskId) return new Set<string>();
    for (const col of localColumns) {
      const task = col.tasks.find((t) => t.id === hoveredTaskId);
      if (task?.subtaskIds && task.subtaskIds.length > 0) {
        return new Set(task.subtaskIds);
      }
    }
    return new Set<string>();
  }, [hoveredTaskId, localColumns]);

  // Sync local state when server data changes (after revalidation)
  useEffect(() => {
    setLocalColumns(columns);
    // Seed page 1 cache for all paginated columns and reset to page 1
    const newState: Record<string, ColumnPaginationState> = {};
    for (const col of columns) {
      const count = effectiveCounts[col.status];
      const pageSize = effectivePageSizes[col.status] ?? DEFAULT_PAGE_SIZE;
      if (count != null && count > pageSize) {
        newState[col.status] = { page: 1, isLoading: false, cache: { 1: col.tasks } };
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
      if (page < 1 || page > totalPages || page === current.page || current.isLoading) return;

      // If we already have this page cached, just swap it in
      if (current.cache[page]) {
        setLocalColumns((prev) =>
          prev.map((col) =>
            col.status === status ? { ...col, tasks: current.cache[page] } : col,
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
        const tasks = await loadColumnTasks(
          boardId,
          workspaceId,
          status,
          offset,
          pageSize,
          effectiveFilters,
        );
        const mapped = tasks as TaskCardData[];
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
    [boardId, workspaceId, effectiveFilters, effectiveCounts, effectivePageSizes, paginationState],
  );

  function onDragEnd(result: DropResult) {
    if (!result.destination) return;
    const newStatus = result.destination.droppableId;
    const oldStatus = result.source.droppableId;
    const taskId = result.draggableId;
    if (oldStatus === newStatus) return;

    // Optimistic update: move the task locally
    setLocalColumns((prev) =>
      prev.map((col) => {
        if (col.status === oldStatus) {
          return { ...col, tasks: col.tasks.filter((t) => t.id !== taskId) };
        }
        if (col.status === newStatus) {
          const task = prev
            .find((c) => c.status === oldStatus)
            ?.tasks.find((t) => t.id === taskId);
          if (task) {
            const updated = { ...task, status: newStatus };
            const newTasks = [...col.tasks];
            newTasks.splice(result.destination!.index, 0, updated);
            return { ...col, tasks: newTasks };
          }
        }
        return col;
      }),
    );

    startTransition(async () => {
      const formData = new FormData();
      formData.set("taskId", taskId);
      formData.set("status", newStatus);
      formData.set("workspaceId", workspaceId);
      await updateTaskStatus(null, formData);
    });
  }

  /** Build the page number buttons, collapsing middle pages with ellipsis. */
  function pageNumbers(currentPage: number, totalPages: number): (number | "ellipsis")[] {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | "ellipsis")[] = [1];
    if (currentPage > 3) pages.push("ellipsis");
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push("ellipsis");
    pages.push(totalPages);
    return pages;
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div
        className={`grid gap-4 lg:grid-cols-4 ${isPending ? "opacity-70" : ""}`}
      >
        {localColumns.map((column) => {
          const colState = paginationState[column.status];
          const hasPagination = !!colState;
          const currentPage = colState?.page ?? 1;
          const isPageLoading = colState?.isLoading ?? false;
          const pageSize = effectivePageSizes[column.status] ?? DEFAULT_PAGE_SIZE;
          const totalCount = effectiveCounts[column.status] ?? column.tasks.length;
          const totalPages = hasPagination ? Math.ceil(totalCount / pageSize) : 1;

          return (
            <div
              key={column.status}
              className="rounded-lg p-2"
              style={{ backgroundColor: column.color + "08" }}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: column.color }}
                  />
                  <h3 className="text-xs font-medium text-fg-secondary">
                    {column.label}
                  </h3>
                  <span className="text-[11px] text-fg-muted">
                    {totalCount}
                  </span>
                  {/* Compact prev/next arrows next to the header */}
                  {hasPagination && (
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => goToPage(column.status, currentPage - 1)}
                        disabled={currentPage === 1 || isPageLoading}
                        className="rounded p-0.5 text-fg-muted transition-colors hover:bg-bg-secondary hover:text-fg-secondary disabled:opacity-30"
                        aria-label="Previous page"
                      >
                        <ChevronLeft size={12} />
                      </button>
                      <button
                        onClick={() => goToPage(column.status, currentPage + 1)}
                        disabled={currentPage === totalPages || isPageLoading}
                        className="rounded p-0.5 text-fg-muted transition-colors hover:bg-bg-secondary hover:text-fg-secondary disabled:opacity-30"
                        aria-label="Next page"
                      >
                        <ChevronRight size={12} />
                      </button>
                    </div>
                  )}
                </div>
                {canCreate && (
                  <CreateTaskForm
                    workspaceId={workspaceId}
                    boardId={boards ? undefined : boardId}
                    boards={boards}
                    defaultStatus={column.status}
                    assigneeId={assigneeId}
                    sprintId={sprintId}
                    sprints={sprints}
                    members={members}
                    tags={tags}
                    compact
                  />
                )}
              </div>

              <Droppable droppableId={column.status}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[60px] space-y-2 rounded-md p-1 transition-colors ${
                      snapshot.isDraggingOver
                        ? "bg-accent/5 ring-1 ring-accent/20"
                        : ""
                    } ${isPageLoading ? "opacity-50" : ""}`}
                  >
                    {column.tasks.map((task, index) => (
                      <Draggable
                        key={task.id}
                        draggableId={task.id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={snapshot.isDragging ? "opacity-90" : ""}
                          >
                            <TaskCard
                              task={task}
                              variant={variant}
                              workspaceId={workspaceId}
                              highlighted={highlightedIds.has(task.id)}
                              onHoverChange={setHoveredTaskId}
                              className={
                                snapshot.isDragging
                                  ? "border-accent/40 shadow-lg shadow-accent/10"
                                  : ""
                              }
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}

                    {column.tasks.length === 0 && !snapshot.isDraggingOver && (
                      <p className="py-4 text-center text-[11px] text-fg-muted">
                        No tasks
                      </p>
                    )}
                  </div>
                )}
              </Droppable>

              {/* Page pagination at the bottom of paginated columns */}
              {hasPagination && (
                <div className="mt-2 flex items-center justify-center gap-1">
                  <button
                    onClick={() => goToPage(column.status, currentPage - 1)}
                    disabled={currentPage === 1 || isPageLoading}
                    className="rounded p-1 text-fg-muted transition-colors hover:bg-bg-secondary hover:text-fg-secondary disabled:opacity-30"
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={13} />
                  </button>

                  {pageNumbers(currentPage, totalPages).map((p, i) =>
                    p === "ellipsis" ? (
                      <span
                        key={`ellipsis-${i}`}
                        className="px-0.5 text-[10px] text-fg-muted"
                      >
                        …
                      </span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => goToPage(column.status, p)}
                        disabled={isPageLoading}
                        className={`min-w-[22px] rounded px-1 py-0.5 text-[11px] font-medium transition-colors ${
                          p === currentPage
                            ? "bg-accent/15 text-accent"
                            : "text-fg-muted hover:bg-bg-secondary hover:text-fg-secondary"
                        } disabled:opacity-50`}
                      >
                        {p}
                      </button>
                    ),
                  )}

                  <button
                    onClick={() => goToPage(column.status, currentPage + 1)}
                    disabled={currentPage === totalPages || isPageLoading}
                    className="rounded p-1 text-fg-muted transition-colors hover:bg-bg-secondary hover:text-fg-secondary disabled:opacity-30"
                    aria-label="Next page"
                  >
                    <ChevronRight size={13} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
