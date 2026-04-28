"use client";

import { useActionState, useState } from "react";
import {
  updateSprint,
  toggleSprintActive,
  deleteSprint,
  migrateSprint,
} from "@/lib/actions/sprint";
import { hasPermission, Permission } from "@/lib/permissions";
import { Pencil, Play, Pause, Trash2, X, ArrowRightLeft } from "lucide-react";
import { Tooltip } from "@/components/tooltip";

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
  const [migrating, setMigrating] = useState(false);
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
  const [migrateState, migrateAction, migratePending] = useActionState(
    migrateSprint,
    null,
  );

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
            className="cursor-pointer text-fg-muted hover:text-fg-secondary"
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
          className="w-full cursor-pointer rounded bg-accent px-2 py-1 text-xs font-medium text-bg-primary hover:bg-accent-emphasis disabled:opacity-50"
        >
          {updatePending ? "Saving..." : "Save"}
        </button>
      </form>
    );
  }

  if (migrating && canEdit) {
    return (
      <form
        action={migrateAction}
        className="w-72 rounded-md border border-border bg-bg-elevated p-3 shadow-lg"
      >
        <input type="hidden" name="sourceSprintId" value={sprint.id} />
        <input type="hidden" name="workspaceId" value={workspaceId} />

        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-fg-secondary">
            Migrate to New Sprint
          </span>
          <button
            type="button"
            onClick={() => setMigrating(false)}
            className="cursor-pointer text-fg-muted hover:text-fg-secondary"
          >
            <X size={12} />
          </button>
        </div>

        <p className="mb-2 text-[11px] text-fg-muted">
          Creates a new sprint and adds all incomplete tasks from this sprint to it.
        </p>

        {migrateState?.error && (
          <p className="mb-2 text-[11px] text-accent-emphasis">
            {migrateState.error}
          </p>
        )}

        <input
          name="title"
          required
          placeholder="New sprint title"
          defaultValue={`${sprint.title} (continued)`}
          className="mb-2 block w-full rounded border border-border bg-bg-primary px-2 py-1 font-mono text-xs text-fg-primary focus:border-accent focus:outline-none"
        />

        <button
          type="submit"
          disabled={migratePending}
          className="w-full cursor-pointer rounded bg-accent px-2 py-1 text-xs font-medium text-bg-primary hover:bg-accent-emphasis disabled:opacity-50"
        >
          {migratePending ? "Migrating..." : "Migrate"}
        </button>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {canEdit && (
        <Tooltip label="Edit sprint">
          <button
            onClick={() => setEditing(true)}
            className="cursor-pointer rounded p-1.5 text-fg-muted transition-colors hover:text-fg-secondary"
          >
            <Pencil size={13} />
          </button>
        </Tooltip>
      )}
      {canEdit && (
        <form action={toggleAction} className="flex">
          <input type="hidden" name="sprintId" value={sprint.id} />
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <Tooltip label={sprint.isActive ? "Close sprint" : "Reopen sprint"}>
            <button
              type="submit"
              disabled={togglePending}
              className="cursor-pointer rounded p-1.5 text-fg-muted transition-colors hover:text-fg-secondary disabled:opacity-50"
              onClick={(e) => {
                if (
                  sprint.isActive &&
                  !confirm(
                    `Close "${sprint.title}"? This will mark the sprint as inactive.`,
                  )
                ) {
                  e.preventDefault();
                }
              }}
            >
              {sprint.isActive ? <Pause size={13} /> : <Play size={13} />}
            </button>
          </Tooltip>
        </form>
      )}
      {canEdit && (
        <Tooltip label="Migrate tasks">
          <button
            onClick={() => setMigrating(true)}
            className="cursor-pointer rounded p-1.5 text-fg-muted transition-colors hover:text-fg-secondary"
          >
            <ArrowRightLeft size={13} />
          </button>
        </Tooltip>
      )}
      {canDelete && (
        <form action={deleteAction} className="flex">
          <input type="hidden" name="sprintId" value={sprint.id} />
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <Tooltip label="Delete sprint" variant="danger">
            <button
              type="submit"
              disabled={deletePending}
              className="cursor-pointer rounded p-1.5 text-red-400/70 transition-colors hover:text-red-400 disabled:opacity-50"
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
          </Tooltip>
        </form>
      )}
    </div>
  );
}
