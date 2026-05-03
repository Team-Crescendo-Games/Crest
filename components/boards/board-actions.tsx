"use client";

import { useActionState, useState } from "react";
import { updateBoard, archiveBoard, deleteBoard } from "@/lib/actions/board";
import { hasPermission, Permission } from "@/lib/permissions";
import { Pencil, Archive, ArchiveRestore, Trash2, X } from "lucide-react";
import { Tooltip } from "@/components/common/tooltip";

interface Props {
  board: {
    id: string;
    name: string;
    description: string | null;
    isActive: boolean;
  };
  workspaceId: string;
  permissions: number;
}

export function BoardActions({ board, workspaceId, permissions }: Props) {
  const [editing, setEditing] = useState(false);
  const [updateState, updateAction, updatePending] = useActionState(
    async (prev: unknown, formData: FormData) => {
      const result = await updateBoard(prev, formData);
      if (result?.success) setEditing(false);
      return result;
    },
    null,
  );
  const [, archiveAction, archivePending] = useActionState(archiveBoard, null);
  const [, deleteAction, deletePending] = useActionState(deleteBoard, null);

  const canEdit = hasPermission(permissions, Permission.EDIT_CONTENT);
  const canDelete = hasPermission(permissions, Permission.DELETE_CONTENT);

  if (editing && canEdit) {
    return (
      <form
        action={updateAction}
        className="w-72 rounded-md border border-border bg-bg-elevated p-3 shadow-lg"
      >
        <input type="hidden" name="boardId" value={board.id} />
        <input type="hidden" name="workspaceId" value={workspaceId} />

        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-fg-secondary">
            Edit Board
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
          <p className="mb-2 text-[10px] text-accent-emphasis">
            {updateState.error}
          </p>
        )}

        <input
          name="name"
          defaultValue={board.name}
          required
          className="mb-2 block w-full rounded border border-border bg-bg-primary px-2 py-1 font-mono text-xs text-fg-primary focus:border-accent focus:outline-none"
        />
        <textarea
          name="description"
          defaultValue={board.description ?? ""}
          rows={2}
          className="mb-2 block w-full resize-none rounded border border-border bg-bg-primary px-2 py-1 font-mono text-xs text-fg-primary focus:border-accent focus:outline-none"
          placeholder="Description"
        />
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

  return (
    <div className="flex items-center gap-1">
      {canEdit && (
        <Tooltip label="Edit board">
          <button
            onClick={() => setEditing(true)}
            className="cursor-pointer rounded p-1.5 text-fg-muted transition-colors hover:text-fg-secondary"
          >
            <Pencil size={13} />
          </button>
        </Tooltip>
      )}
      {canEdit && (
        <form action={archiveAction} className="flex">
          <input type="hidden" name="boardId" value={board.id} />
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <Tooltip label={board.isActive ? "Archive" : "Unarchive"}>
            <button
              type="submit"
              disabled={archivePending}
              onClick={(e) => {
                if (
                  board.isActive &&
                  !confirm(
                    `Archive "${board.name}"? The board and its tasks will be hidden from the sidebar and active boards list until you restore it.`,
                  )
                ) {
                  e.preventDefault();
                }
              }}
              className="cursor-pointer rounded p-1.5 text-fg-muted transition-colors hover:text-fg-secondary disabled:opacity-50"
            >
              {board.isActive ? (
                <Archive size={13} />
              ) : (
                <ArchiveRestore size={13} />
              )}
            </button>
          </Tooltip>
        </form>
      )}
      {canDelete && (
        <form action={deleteAction} className="flex">
          <input type="hidden" name="boardId" value={board.id} />
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <Tooltip label="Delete board" variant="danger">
            <button
              type="submit"
              disabled={deletePending}
              className="cursor-pointer rounded p-1.5 text-red-400/70 transition-colors hover:text-red-400 disabled:opacity-50"
              onClick={(e) => {
                if (
                  !confirm(
                    `Delete "${board.name}"? All tasks will be permanently deleted.`,
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
