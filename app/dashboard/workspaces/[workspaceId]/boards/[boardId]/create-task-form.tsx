"use client";

import { useActionState } from "react";
import { useState } from "react";
import { createTask } from "@/lib/actions/task";
import { Plus, X } from "lucide-react";

export function CreateTaskForm({
  boardId,
  workspaceId,
  defaultStatus = "NOT_STARTED",
  compact = false,
}: {
  boardId: string;
  workspaceId: string;
  defaultStatus?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(
    async (prev: unknown, formData: FormData) => {
      const result = await createTask(prev, formData);
      if (result?.success) setOpen(false);
      return result;
    },
    null,
  );

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={`flex items-center gap-1 rounded-md border border-border bg-bg-secondary text-fg-secondary transition-colors hover:border-accent/40 hover:text-accent ${
          compact ? "px-2 py-1 text-[11px]" : "px-3 py-2 text-xs"
        }`}
      >
        <Plus size={compact ? 10 : 12} />
        {compact ? "Add" : "Add Task"}
      </button>
    );
  }

  return (
    <form
      action={action}
      className="rounded-md border border-border bg-bg-elevated/80 p-3 backdrop-blur-sm"
    >
      <input type="hidden" name="boardId" value={boardId} />
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="status" value={defaultStatus} />

      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-medium text-fg-secondary">New Task</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-fg-muted hover:text-fg-secondary"
        >
          <X size={12} />
        </button>
      </div>

      {state?.error && (
        <div className="mb-2 rounded border border-accent-emphasis/30 bg-accent-emphasis/10 px-2 py-1 text-[11px] text-accent-emphasis">
          {state.error}
        </div>
      )}

      <input
        name="title"
        type="text"
        required
        className="mb-2 block w-full rounded border border-border bg-bg-primary px-2 py-1.5 font-mono text-xs text-fg-primary placeholder-fg-muted focus:border-accent focus:outline-none"
        placeholder="Task title"
        autoFocus
      />

      {!compact && (
        <textarea
          name="description"
          rows={2}
          className="mb-2 block w-full resize-none rounded border border-border bg-bg-primary px-2 py-1.5 font-mono text-xs text-fg-primary placeholder-fg-muted focus:border-accent focus:outline-none"
          placeholder="Description (optional)"
        />
      )}

      <div className="mb-2">
        <input
          name="dueDate"
          type="date"
          required
          className="block w-full rounded border border-border bg-bg-primary px-2 py-1.5 font-mono text-xs text-fg-primary focus:border-accent focus:outline-none"
        />
      </div>

      <div className="flex justify-end gap-1.5">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded px-2 py-1 text-[11px] text-fg-muted hover:text-fg-secondary"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-accent px-2 py-1 text-[11px] font-medium text-bg-primary hover:bg-accent-emphasis disabled:opacity-50"
        >
          {pending ? "..." : "Create"}
        </button>
      </div>
    </form>
  );
}
