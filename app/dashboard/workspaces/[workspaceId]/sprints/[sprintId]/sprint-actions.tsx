"use client";

import { useActionState, useState } from "react";
import {
  updateSprint,
  toggleSprintActive,
  deleteSprint,
} from "@/lib/actions/sprint";
import { hasPermission, Permission } from "@/lib/permissions";
import { Pencil, Play, Pause, Trash2, X } from "lucide-react";

interface Props {
  sprint: {
    id: string;
    title: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
  };
  workspaceId: string;
  permissions: number;
}

export function SprintActions({ sprint, workspaceId, permissions }: Props) {
  const [editing, setEditing] = useState(false);
  const [updateState, updateAction, updatePending] = useActionState(
    async (prev: unknown, formData: FormData) => {
      const result = await updateSprint(prev, formData);
      if (result?.success) setEditing(false);
      return result;
    },
    null,
  );
  const [, toggleAction, togglePending] = useActionState(
    toggleSprintActive,
    null,
  );
  const [, deleteAction, deletePending] = useActionState(deleteSprint, null);

  const canEdit = hasPermission(permissions, Permission.EDIT_CONTENT);
  const canDelete = hasPermission(permissions, Permission.DELETE_CONTENT);

  if (editing && canEdit) {
    return (
      <form
        action={updateAction}
        className="w-72 rounded-md border border-border bg-bg-elevated p-3 shadow-lg"
      >
        <input type="hidden" name="sprintId" value={sprint.id} />
        <input type="hidden" name="workspaceId" value={workspaceId} />

        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-fg-secondary">
            Edit Sprint
          </span>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-fg-muted hover:text-fg-secondary"
          >
            <X size={12} />
          </button>
        </div>

        {updateState?.error && (
          <p className="mb-2 text-[11px] text-accent-emphasis">
            {updateState.error}
          </p>
        )}

        <input
          name="title"
          defaultValue={sprint.title}
          required
          className="mb-2 block w-full rounded border border-border bg-bg-primary px-2 py-1 font-mono text-xs text-fg-primary focus:border-accent focus:outline-none"
        />
        <div className="mb-2 grid grid-cols-2 gap-2">
          <input
            name="startDate"
            type="date"
            defaultValue={sprint.startDate}
            className="rounded border border-border bg-bg-primary px-2 py-1 font-mono text-xs text-fg-primary focus:border-accent focus:outline-none"
          />
          <input
            name="endDate"
            type="date"
            defaultValue={sprint.endDate}
            className="rounded border border-border bg-bg-primary px-2 py-1 font-mono text-xs text-fg-primary focus:border-accent focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={updatePending}
          className="w-full rounded bg-accent px-2 py-1 text-xs font-medium text-bg-primary hover:bg-accent-emphasis disabled:opacity-50"
        >
          {updatePending ? "Saving..." : "Save"}
        </button>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {canEdit && (
        <button
          onClick={() => setEditing(true)}
          className="rounded p-1.5 text-fg-muted transition-colors hover:text-fg-secondary"
          title="Edit sprint"
        >
          <Pencil size={13} />
        </button>
      )}
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
            {sprint.isActive ? <Pause size={13} /> : <Play size={13} />}
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
            <Trash2 size={13} />
          </button>
        </form>
      )}
    </div>
  );
}
