"use client";

import { useActionState, useTransition } from "react";
import Link from "next/link";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { Archive, ArchiveRestore, Trash2, Settings } from "lucide-react";
import { archiveBoard, deleteBoard } from "@/lib/actions/board";
import { updateTaskStatus } from "@/lib/actions/task";
import { hasPermission, Permission } from "@/lib/permissions";
import { TaskStatus } from "@/prisma/generated/prisma/enums";
import { CreateTaskForm } from "./[boardId]/create-task-form";
import { TaskCard, type TaskCardData } from "@/components/task-card";

interface Board {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  tasks: TaskCardData[];
  _count: { tasks: number };
}

export function BoardRow({
  board,
  workspaceId,
  statusOrder,
  statusLabels,
  statusColors,
  searchQuery,
  permissions,
}: {
  board: Board;
  workspaceId: string;
  statusOrder: TaskStatus[];
  statusLabels: Record<TaskStatus, string>;
  statusColors: Record<TaskStatus, string>;
  searchQuery?: string;
  permissions: number;
}) {
  const [, archiveAction, archivePending] = useActionState(archiveBoard, null);
  const [, deleteAction, deletePending] = useActionState(deleteBoard, null);
  const [isDragging, startTransition] = useTransition();

  const canEdit = hasPermission(permissions, Permission.EDIT_CONTENT);
  const canDelete = hasPermission(permissions, Permission.DELETE_CONTENT);
  const canCreate = hasPermission(permissions, Permission.CREATE_CONTENT);

  const tasksByStatus = statusOrder.map((status) => ({
    status,
    label: statusLabels[status],
    color: statusColors[status],
    tasks: board.tasks.filter((t) => t.status === status),
  }));

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
    <div
      className={`rounded-md border bg-bg-elevated/60 backdrop-blur-sm ${
        board.isActive
          ? "border-border"
          : "border-dashed border-border opacity-60"
      } ${isDragging ? "opacity-70" : ""}`}
    >
      {/* Board header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <Link
            href={`/dashboard/workspaces/${workspaceId}/boards/${board.id}`}
            className="font-mono text-sm font-medium text-fg-primary transition-colors hover:text-accent"
          >
            {board.name}
          </Link>
          {!board.isActive && (
            <span className="rounded bg-bg-secondary px-1.5 py-0.5 text-[11px] text-fg-muted">
              Archived
            </span>
          )}
          <span className="text-[11px] text-fg-muted">
            {board._count.tasks} task{board._count.tasks !== 1 && "s"}
            {searchQuery && board.tasks.length !== board._count.tasks && (
              <> · {board.tasks.length} matching</>
            )}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {canEdit && (
            <Link
              href={`/dashboard/workspaces/${workspaceId}/boards/${board.id}`}
              className="rounded p-1 text-fg-muted transition-colors hover:text-fg-secondary"
              title="Board details"
            >
              <Settings size={12} />
            </Link>
          )}
          {canEdit && (
            <form action={archiveAction}>
              <input type="hidden" name="boardId" value={board.id} />
              <input type="hidden" name="workspaceId" value={workspaceId} />
              <button
                type="submit"
                disabled={archivePending}
                className="rounded p-1 text-fg-muted transition-colors hover:text-fg-secondary disabled:opacity-50"
                title={board.isActive ? "Archive" : "Unarchive"}
              >
                {board.isActive ? (
                  <Archive size={12} />
                ) : (
                  <ArchiveRestore size={12} />
                )}
              </button>
            </form>
          )}
          {canDelete && (
            <form action={deleteAction}>
              <input type="hidden" name="boardId" value={board.id} />
              <input type="hidden" name="workspaceId" value={workspaceId} />
              <button
                type="submit"
                disabled={deletePending}
                className="rounded p-1 text-fg-muted transition-colors hover:text-accent-emphasis disabled:opacity-50"
                title="Delete board"
                onClick={(e) => {
                  if (
                    !confirm(
                      `Delete "${board.name}"? All tasks will be permanently deleted.`,
                    )
                  )
                    e.preventDefault();
                }}
              >
                <Trash2 size={12} />
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Status columns with drag-and-drop */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid gap-px lg:grid-cols-4">
          {tasksByStatus.map((column) => (
            <div key={column.status} className="p-2">
              <div className="mb-2 flex items-center gap-1.5">
                <div
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: column.color }}
                />
                <span className="text-[11px] font-medium text-fg-muted">
                  {column.label}
                </span>
                <span className="text-[11px] text-fg-muted">
                  ({column.tasks.length})
                </span>
              </div>

              <Droppable droppableId={column.status}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[40px] max-h-64 space-y-1.5 overflow-y-auto rounded pr-1 transition-colors ${
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
                              task={{ ...task, boardId: board.id }}
                              variant="simple"
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
                      <p className="py-3 text-center text-[11px] text-fg-muted">
                        —
                      </p>
                    )}
                  </div>
                )}
              </Droppable>

              {canCreate && board.isActive && (
                <div className="mt-1.5">
                  <CreateTaskForm
                    boardId={board.id}
                    workspaceId={workspaceId}
                    defaultStatus={column.status}
                    compact
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}
