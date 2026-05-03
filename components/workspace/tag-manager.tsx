"use client";

import { useActionState, useState } from "react";
import { createTag, updateTag, deleteTag } from "@/lib/actions/tag";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";

const PRESET_COLORS = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#d946ef",
  "#ec4899",
  "#f43f5e",
  "#6B7280",
];

interface Tag {
  id: string;
  name: string;
  color: string | null;
}

export function TagManager({
  tags,
  workspaceId,
  canCreate,
  canEdit,
  canDelete,
}: {
  tags: Tag[];
  workspaceId: string;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <TagItem
            key={tag.id}
            tag={tag}
            workspaceId={workspaceId}
            canEdit={canEdit}
            canDelete={canDelete}
          />
        ))}

        {canCreate && !showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-fg-muted transition-colors hover:border-accent/40 hover:text-accent"
          >
            <Plus size={11} />
            Add tag
          </button>
        )}
      </div>

      {showCreate && (
        <CreateTagForm
          workspaceId={workspaceId}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}

function TagItem({
  tag,
  workspaceId,
  canEdit,
  canDelete,
}: {
  tag: Tag;
  workspaceId: string;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editState, editAction, editPending] = useActionState(
    async (prev: unknown, formData: FormData) => {
      const result = await updateTag(prev, formData);
      if (result?.success) setEditing(false);
      return result;
    },
    null,
  );

  const color = tag.color ?? "#6B7280";

  if (editing) {
    return (
      <TagForm
        action={editAction}
        pending={editPending}
        error={editState?.error}
        defaultName={tag.name}
        defaultColor={color}
        workspaceId={workspaceId}
        tagId={tag.id}
        canDelete={canDelete}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="group relative">
      <span
        className="rounded-full border px-2.5 py-1 text-xs font-medium"
        style={{ borderColor: color + "40", color }}
      >
        {tag.name}
      </span>
      {canEdit && (
        <button
          onClick={() => setEditing(true)}
          className="absolute -right-1 -top-1 hidden rounded-full bg-bg-elevated p-0.5 shadow-sm border border-border text-fg-muted hover:text-fg-secondary group-hover:block"
        >
          <Pencil size={9} />
        </button>
      )}
    </div>
  );
}

function CreateTagForm({
  workspaceId,
  onClose,
}: {
  workspaceId: string;
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState(
    async (prev: unknown, formData: FormData) => {
      const result = await createTag(prev, formData);
      if (result?.success) onClose();
      return result;
    },
    null,
  );

  return (
    <TagForm
      action={action}
      pending={pending}
      error={state?.error}
      defaultName=""
      defaultColor="#6B7280"
      workspaceId={workspaceId}
      onCancel={onClose}
    />
  );
}

function TagForm({
  action,
  pending,
  error,
  defaultName,
  defaultColor,
  workspaceId,
  tagId,
  canDelete,
  onCancel,
}: {
  action: (formData: FormData) => void;
  pending: boolean;
  error?: string | null;
  defaultName: string;
  defaultColor: string;
  workspaceId: string;
  tagId?: string;
  canDelete?: boolean;
  onCancel: () => void;
}) {
  const [color, setColor] = useState(defaultColor);
  const [customColor, setCustomColor] = useState(
    PRESET_COLORS.includes(defaultColor) ? "" : defaultColor,
  );
  const [, deleteAction, deletePending] = useActionState(deleteTag, null);

  return (
    <form
      action={action}
      className="mt-3 rounded-md border border-border bg-bg-elevated/80 p-3 backdrop-blur-sm"
    >
      <input type="hidden" name="workspaceId" value={workspaceId} />
      {tagId && <input type="hidden" name="tagId" value={tagId} />}
      <input type="hidden" name="color" value={color} />

      {error && (
        <p className="mb-2 text-[11px] text-accent-emphasis">{error}</p>
      )}

      <div className="mb-3 flex items-center gap-2">
        <div
          className="h-6 w-6 shrink-0 rounded-full border border-border"
          style={{ backgroundColor: color }}
        />
        <input
          name="name"
          defaultValue={defaultName}
          required
          placeholder="Tag name"
          className="flex-1 rounded border border-border bg-bg-primary px-2 py-1 font-mono text-xs text-fg-primary placeholder-fg-muted focus:border-accent focus:outline-none"
          autoFocus
        />
      </div>

      {/* Color presets */}
      <div className="mb-2">
        <p className="mb-1.5 text-[11px] text-fg-muted">Color</p>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setColor(c);
                setCustomColor("");
              }}
              className={`h-5 w-5 rounded-full border transition-transform hover:scale-110 ${
                color === c
                  ? "border-fg-primary scale-110"
                  : "border-transparent"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {/* Custom hex */}
      <div className="mb-3 flex items-center gap-2">
        <span className="text-[11px] text-fg-muted">Custom:</span>
        <input
          type="text"
          value={customColor}
          onChange={(e) => {
            const val = e.target.value;
            setCustomColor(val);
            if (/^#[0-9a-fA-F]{6}$/.test(val)) {
              setColor(val);
            }
          }}
          placeholder="#hex"
          className="w-20 rounded border border-border bg-bg-primary px-2 py-0.5 font-mono text-[11px] text-fg-primary focus:border-accent focus:outline-none"
        />
      </div>

      <div className="flex items-center justify-between">
        {/* Delete button (only in edit mode) */}
        {tagId && canDelete ? (
          <button
            type="button"
            disabled={deletePending}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-fg-muted hover:text-accent-emphasis disabled:opacity-50"
            onClick={() => {
              if (confirm(`Delete tag "${defaultName}"?`)) {
                const fd = new FormData();
                fd.set("tagId", tagId);
                fd.set("workspaceId", workspaceId);
                deleteAction(fd);
              }
            }}
          >
            <Trash2 size={11} />
            Delete
          </button>
        ) : (
          <div />
        )}

        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={onCancel}
            className="rounded px-2 py-1 text-xs text-fg-muted hover:text-fg-secondary"
          >
            <X size={12} />
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded bg-accent px-2 py-1 text-xs font-medium text-bg-primary hover:bg-accent-emphasis disabled:opacity-50"
          >
            {pending ? "..." : <Check size={12} />}
          </button>
        </div>
      </div>
    </form>
  );
}
