"use client";

import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { useTransition } from "react";
import Link from "next/link";
import { updateTaskStatus } from "@/lib/actions/task";
import { CreateTaskForm } from "@/app/dashboard/workspaces/[workspaceId]/boards/[boardId]/create-task-form";
import { TaskCard, type TaskCardData } from "@/components/task-card";

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
}: {
  columns: Column[];
  boardId: string;
  workspaceId: string;
  canCreate: boolean;
  variant?: "simple" | "detailed";
}) {
  const [isPending, startTransition] = useTransition();

  function onDragEnd(result: DropResult) {
    if (!result.destination) return;
    const newStatus = result.destination.droppableId;
    const taskId = result.draggableId;
    if (result.source.droppableId === newStatus) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.set("taskId", taskId);
      formData.set("status", newStatus);
      formData.set("workspaceId", workspaceId);
      await updateTaskStatus(null, formData);
    });
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div
        className={`grid gap-4 lg:grid-cols-4 ${isPending ? "opacity-70" : ""}`}
      >
        {columns.map((column) => (
          <div key={column.status}>
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
                  {column.tasks.length}
                </span>
              </div>
              {canCreate && (
                <CreateTaskForm
                  boardId={boardId}
                  workspaceId={workspaceId}
                  defaultStatus={column.status}
                  compact
                />
              )}
            </div>

            <Droppable droppableId={column.status}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`min-h-[60px] max-h-[60vh] space-y-2 overflow-y-auto rounded-md p-1 transition-colors ${
                    snapshot.isDraggingOver
                      ? "bg-accent/5 ring-1 ring-accent/20"
                      : ""
                  }`}
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
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}
