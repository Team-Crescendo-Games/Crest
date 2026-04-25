"use client";

import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { useState, useTransition, useEffect, useCallback } from "react";
import { updateTaskStatus, loadCompletedTasks } from "@/lib/actions/task";
import { CreateTaskForm } from "@/components/create-task-form";
import { TaskCard, type TaskCardData } from "@/components/task-card";
import { ChevronLeft, ChevronRight } from "lucide-react";

const COMPLETED_PAGE_SIZE = 10;

interface Column {
  status: string;
  label: string;
  color: string;
  tasks: TaskCardData[];
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
  completedCount?: number;
  completedFilters?: {
    q?: string;
    priorities?: string[];
    tagFilters?: string[];
    assigneeFilters?: string[];
  };
}) {
  const [isPending, startTransition] = useTransition();
  const [localColumns, setLocalColumns] = useState(columns);

  // Pagination state for the Completed column
  const hasPagination = completedCount != null && completedCount > COMPLETED_PAGE_SIZE;
  const totalPages = hasPagination
    ? Math.ceil(completedCount / COMPLETED_PAGE_SIZE)
    : 1;
  const [completedPage, setCompletedPage] = useState(1);
  const [isPageLoading, setIsPageLoading] = useState(false);
  // Cache fetched pages so navigating back doesn't re-fetch
  const [pageCache, setPageCache] = useState<Record<number, TaskCardData[]>>({});

  // Sync local state when server data changes (after revalidation)
  useEffect(() => {
    setLocalColumns(columns);
    // Page 1 data comes from the server, seed the cache
    const completedCol = columns.find((c) => c.status === "COMPLETED");
    if (completedCol) {
      setPageCache((prev) => ({ ...prev, 1: completedCol.tasks }));
    }
    setCompletedPage(1);
  }, [columns]);

  const goToPage = useCallback(
    async (page: number) => {
      if (page < 1 || page > totalPages || page === completedPage || isPageLoading) return;

      // If we already have this page cached, just swap it in
      if (pageCache[page]) {
        setLocalColumns((prev) =>
          prev.map((col) =>
            col.status === "COMPLETED"
              ? { ...col, tasks: pageCache[page] }
              : col,
          ),
        );
        setCompletedPage(page);
        return;
      }

      setIsPageLoading(true);
      try {
        const offset = (page - 1) * COMPLETED_PAGE_SIZE;
        const tasks = await loadCompletedTasks(
          boardId,
          workspaceId,
          offset,
          COMPLETED_PAGE_SIZE,
          completedFilters,
        );
        const mapped = tasks as TaskCardData[];
        setPageCache((prev) => ({ ...prev, [page]: mapped }));
        setLocalColumns((prev) =>
          prev.map((col) =>
            col.status === "COMPLETED"
              ? { ...col, tasks: mapped }
              : col,
          ),
        );
        setCompletedPage(page);
      } finally {
        setIsPageLoading(false);
      }
    },
    [boardId, workspaceId, completedFilters, completedPage, totalPages, isPageLoading, pageCache],
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
  function pageNumbers(): (number | "ellipsis")[] {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | "ellipsis")[] = [1];
    if (completedPage > 3) pages.push("ellipsis");
    const start = Math.max(2, completedPage - 1);
    const end = Math.min(totalPages - 1, completedPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (completedPage < totalPages - 2) pages.push("ellipsis");
    pages.push(totalPages);
    return pages;
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div
        className={`grid gap-4 lg:grid-cols-4 ${isPending ? "opacity-70" : ""}`}
      >
        {localColumns.map((column) => {
          const isCompleted = column.status === "COMPLETED";

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
                    {isCompleted && completedCount != null
                      ? completedCount
                      : column.tasks.length}
                  </span>
                  {/* Compact prev/next arrows next to the header */}
                  {isCompleted && hasPagination && (
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => goToPage(completedPage - 1)}
                        disabled={completedPage === 1 || isPageLoading}
                        className="rounded p-0.5 text-fg-muted transition-colors hover:bg-bg-secondary hover:text-fg-secondary disabled:opacity-30"
                        aria-label="Previous page"
                      >
                        <ChevronLeft size={12} />
                      </button>
                      <button
                        onClick={() => goToPage(completedPage + 1)}
                        disabled={completedPage === totalPages || isPageLoading}
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
                    } ${isCompleted && isPageLoading ? "opacity-50" : ""}`}
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

              {/* Page pagination at the bottom of the Completed column */}
              {isCompleted && hasPagination && (
                <div className="mt-2 flex items-center justify-center gap-1">
                  <button
                    onClick={() => goToPage(completedPage - 1)}
                    disabled={completedPage === 1 || isPageLoading}
                    className="rounded p-1 text-fg-muted transition-colors hover:bg-bg-secondary hover:text-fg-secondary disabled:opacity-30"
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={13} />
                  </button>

                  {pageNumbers().map((p, i) =>
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
                        onClick={() => goToPage(p)}
                        disabled={isPageLoading}
                        className={`min-w-[22px] rounded px-1 py-0.5 text-[11px] font-medium transition-colors ${
                          p === completedPage
                            ? "bg-accent/15 text-accent"
                            : "text-fg-muted hover:bg-bg-secondary hover:text-fg-secondary"
                        } disabled:opacity-50`}
                      >
                        {p}
                      </button>
                    ),
                  )}

                  <button
                    onClick={() => goToPage(completedPage + 1)}
                    disabled={completedPage === totalPages || isPageLoading}
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
