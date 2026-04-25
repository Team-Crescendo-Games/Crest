"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { createTask } from "@/lib/actions/task";

interface Board {
  id: string;
  name: string;
}

/**
 * Add Task button for the sprint view.
 *
 * Tasks belong to boards, not sprints, so creating a task from the sprint
 * page requires picking which board it goes to. The new task is created on
 * that board and automatically attached to this sprint.
 */
export function SprintCreateTaskForm({
  sprintId,
  workspaceId,
  boards,
}: {
  sprintId: string;
  workspaceId: string;
  boards: Board[];
}) {
  const [open, setOpen] = useState(false);

  if (boards.length === 0) {
    return (
      <button
        type="button"
        disabled
        title="Create a board first to add tasks"
        className="flex items-center gap-1.5 rounded-md border border-border bg-bg-secondary px-3 py-1.5 text-xs font-medium text-fg-muted opacity-50"
      >
        <Plus size={12} />
        Add Task
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-md border border-border bg-bg-secondary px-3 py-1.5 text-xs font-medium text-fg-secondary transition-colors hover:border-accent/40 hover:text-accent"
      >
        <Plus size={12} />
        Add Task
      </button>

      {open && (
        <SprintCreateTaskModal
          sprintId={sprintId}
          workspaceId={workspaceId}
          boards={boards}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function SprintCreateTaskModal({
  sprintId,
  workspaceId,
  boards,
  onClose,
}: {
  sprintId: string;
  workspaceId: string;
  boards: Board[];
  onClose: () => void;
}) {
  const router = useRouter();

  const [state, action, pending] = useActionState(
    async (prev: unknown, formData: FormData) => {
      const result = await createTask(prev, formData);
      if (result?.success && result.newTaskId) {
        onClose();
        router.refresh();
      }
      return result;
    },
    null,
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        action={action}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md space-y-3 rounded-md border border-border bg-bg-elevated p-4 shadow-lg"
      >
        <input type="hidden" name="workspaceId" value={workspaceId} />
        <input type="hidden" name="sprintId" value={sprintId} />

        <div className="flex items-center justify-between">
          <h3 className="font-mono text-xs font-medium text-fg-primary">
            New Task in Sprint
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-fg-muted hover:text-fg-secondary"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        {state?.error && (
          <div className="rounded border border-accent-emphasis/30 bg-accent-emphasis/10 px-2 py-1 text-[11px] text-accent-emphasis">
            {state.error}
          </div>
        )}

        <div>
          <label className="block text-[11px] font-medium text-fg-muted">
            Board
          </label>
          <select
            name="boardId"
            required
            defaultValue={boards[0]?.id}
            className="mt-1 block w-full rounded border border-border bg-bg-primary px-2 py-1.5 font-mono text-xs text-fg-primary focus:border-accent focus:outline-none"
          >
            {boards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-fg-muted">
            Title
          </label>
          <input
            name="title"
            type="text"
            required
            autoFocus
            placeholder="Task title"
            className="mt-1 block w-full rounded border border-border bg-bg-primary px-2 py-1.5 font-mono text-xs text-fg-primary placeholder-fg-muted focus:border-accent focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-fg-muted">
            Description
          </label>
          <textarea
            name="description"
            rows={2}
            placeholder="(optional)"
            className="mt-1 block w-full resize-none rounded border border-border bg-bg-primary px-2 py-1.5 font-mono text-xs text-fg-primary placeholder-fg-muted focus:border-accent focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-medium text-fg-muted">
              Priority
            </label>
            <select
              name="priority"
              defaultValue="NONE"
              className="mt-1 block w-full rounded border border-border bg-bg-primary px-2 py-1.5 font-mono text-xs text-fg-primary focus:border-accent focus:outline-none"
            >
              <option value="NONE">None</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-fg-muted">
              Due Date
            </label>
            <input
              name="dueDate"
              type="date"
              required
              className="mt-1 block w-full rounded border border-border bg-bg-primary px-2 py-1.5 font-mono text-xs text-fg-primary focus:border-accent focus:outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-3 py-1.5 text-xs text-fg-muted hover:text-fg-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-bg-primary hover:bg-accent-emphasis disabled:opacity-50"
          >
            {pending ? "Creating..." : "Create Task"}
          </button>
        </div>
      </form>
    </div>
  );
}
