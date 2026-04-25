"use client";

import { useActionState, useTransition } from "react";
import Link from "next/link";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { Play, Pause, Trash2, Calendar } from "lucide-react";
import { toggleSprintActive, deleteSprint } from "@/lib/actions/sprint";
import { updateTaskStatus } from "@/lib/actions/task";
import { hasPermission, Permission } from "@/lib/permissions";
import { TaskStatus } from "@/prisma/generated/prisma/enums";

const STATUS_ORDER: TaskStatus[] = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "IN_REVIEW",
  "COMPLETED",
];

const STATUS_LABELS: Record<TaskStatus, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  COMPLETED: "Completed",
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  NOT_STARTED: "#9c9c98",
  IN_PROGRESS: "#f1c258",
  IN_REVIEW: "#f0a468",
  COMPLETED: "#6bc96b",
};

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: "#ef4444",
  HIGH: "#f0a468",
  MEDIUM: "#f1c258",
  LOW: "#6bc96b",
  NONE: "",
};

interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  priority: string;
  dueDate: Date | null;
  board: { name: string };
  assignees: { id: string; name: string | null }[];
  tags: { name: string; color: string | null }[];
}

interface Sprint {
  id: string;
  title: string;
  startDate: Date | null;
  endDate: Date | null;
  isActive: boolean;
  tasks: Task[];
  _count: { tasks: number };
}

export function SprintRow({
  sprint,
  workspaceId,
  permissions,
}: {
  sprint: Sprint;
  workspaceId: string;
  permissions: number;
}) {
  const [, toggleAction, togglePending] = useActionState(
    toggleSprintActive,
    null,
  );
  const [, deleteAction, deletePending] = useActionState(deleteSprint, null);
  const [isDragging, startTransition] = useTransition();

  const canEdit = hasPermission(permissions, Permission.EDIT_CONTENT);
  const canDelete = hasPermission(permissions, Permission.DELETE_CONTENT);

  const tasksByStatus = STATUS_ORDER.map((status) => ({
    status,
    label: STATUS_LABELS[status],
    color: STATUS_COLORS[status],
    tasks: sprint.tasks.filter((t) => t.status === status),
  }));

  // Timeline progress
  const now = new Date();
  let progress = 0;
  if (sprint.startDate && sprint.endDate) {
    const start = new Date(sprint.startDate).getTime();
    const end = new Date(sprint.endDate).getTime();
    const total = end - start;
    if (total > 0) {
      progress = Math.min(
        100,
        Math.max(0, ((now.getTime() - start) / total) * 100),
      );
    }
  }

  const completedCount =
    tasksByStatus.find((c) => c.status === "COMPLETED")?.tasks.length ?? 0;
  const taskCompletion =
    sprint._count.tasks > 0
      ? Math.round((completedCount / sprint._count.tasks) * 100)
      : 0;

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
        sprint.isActive
          ? "border-border"
          : "border-dashed border-border opacity-60"
      } ${isDragging ? "opacity-70" : ""}`}
    >
      {/* Sprint header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex-1">
          <div className="flex items-center gap-2.5">
            <Link
              href={`/dashboard/workspaces/${workspaceId}/sprints/${sprint.id}`}
              className="font-mono text-sm font-medium text-fg-primary transition-colors hover:text-accent"
            >
              {sprint.title}
            </Link>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                sprint.isActive
                  ? "bg-accent/10 text-accent"
                  : "bg-bg-secondary text-fg-muted"
              }`}
            >
              {sprint.isActive ? "Active" : "Closed"}
            </span>
            <span className="text-[11px] text-fg-muted">
              {sprint._count.tasks} task
              {sprint._count.tasks !== 1 && "s"} · {taskCompletion}% done
            </span>
          </div>

          {/* Timeline bar */}
          {sprint.startDate && sprint.endDate && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex items-center gap-1 text-[11px] text-fg-muted">
                <Calendar size={10} />
                {new Date(sprint.startDate).toLocaleDateString()} –{" "}
                {new Date(sprint.endDate).toLocaleDateString()}
              </div>
              <div className="flex-1">
                <div className="h-1.5 rounded-full bg-bg-secondary">
                  <div
                    className="h-1.5 rounded-full bg-accent/40 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              <span className="text-[11px] text-fg-muted">
                {Math.round(progress)}% elapsed
              </span>
            </div>
          )}
        </div>

        <div className="ml-4 flex items-center gap-1">
          {canEdit && (
            <form action={toggleAction}>
              <input type="hidden" name="sprintId" value={sprint.id} />
              <input type="hidden" name="workspaceId" value={workspaceId} />
              <button
                type="submit"
                disabled={togglePending}
                className="rounded p-1.5 text-fg-muted transition-colors hover:text-fg-secondary disabled:opacity-50"
                title={sprint.isActive ? "Close sprint" : "Reopen sprint"}
              >
                {sprint.isActive ? <Pause size={12} /> : <Play size={12} />}
              </button>
            </form>
          )}
          {canDelete && (
            <form action={deleteAction}>
              <input type="hidden" name="sprintId" value={sprint.id} />
              <input type="hidden" name="workspaceId" value={workspaceId} />
              <button
                type="submit"
                disabled={deletePending}
                className="rounded p-1.5 text-fg-muted transition-colors hover:text-accent-emphasis disabled:opacity-50"
                title="Delete sprint"
                onClick={(e) => {
                  if (
                    !confirm(
                      `Delete "${sprint.title}"? Tasks will be unassigned but not deleted.`,
                    )
                  ) {
                    e.preventDefault();
                  }
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
                            className={`rounded border bg-bg-primary/60 p-2 transition-colors ${
                              snapshot.isDragging
                                ? "border-accent/40 shadow-lg shadow-accent/10"
                                : "border-border-subtle hover:border-accent/20"
                            }`}
                          >
                            <div className="flex items-start gap-1.5">
                              {task.priority !== "NONE" && (
                                <div
                                  className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full"
                                  style={{
                                    color: PRIORITY_COLORS[task.priority],
                                    backgroundColor:
                                      PRIORITY_COLORS[task.priority],
                                  }}
                                />
                              )}
                              <p className="font-mono text-xs font-medium text-fg-primary line-clamp-2">
                                {task.title}
                              </p>
                            </div>
                            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                              <span className="rounded bg-bg-secondary px-1 py-px text-[10px] text-fg-muted">
                                {task.board.name}
                              </span>
                              {task.tags.map((tag) => (
                                <span
                                  key={tag.name}
                                  className="rounded px-1 py-px text-[9px]"
                                  style={{
                                    backgroundColor:
                                      (tag.color ?? "#6B7280") + "15",
                                    color: tag.color ?? "#6B7280",
                                  }}
                                >
                                  {tag.name}
                                </span>
                              ))}
                              {task.dueDate && (
                                <span className="text-[10px] text-fg-muted">
                                  Due{" "}
                                  {new Date(task.dueDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
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
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}
