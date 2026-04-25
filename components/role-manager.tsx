"use client";

import { useActionState, useState } from "react";
import { createRole, updateRole, deleteRole } from "@/lib/actions/role";
import { Plus, Pencil, Trash2, X, Check, Shield } from "lucide-react";
import {
  Permission,
  PERMISSION_LABELS,
  type PermissionKey,
  hasPermission,
} from "@/lib/permissions";

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

const PROTECTED_ROLES = ["Owner", "Member"];

interface Role {
  id: string;
  name: string;
  color: string;
  permissions: number;
  _count: { members: number };
}

export function RoleManager({
  roles,
  workspaceId,
  canManage,
}: {
  roles: Role[];
  workspaceId: string;
  canManage: boolean;
}) {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="space-y-2">
      {roles.map((role) => (
        <RoleItem
          key={role.id}
          role={role}
          workspaceId={workspaceId}
          canManage={canManage}
        />
      ))}

      {canManage && !showCreate && (
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 rounded-md border border-dashed border-border px-3 py-2 text-xs text-fg-muted transition-colors hover:border-accent/40 hover:text-accent"
        >
          <Plus size={12} />
          Create role
        </button>
      )}

      {showCreate && (
        <CreateRoleForm
          workspaceId={workspaceId}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}

function RoleItem({
  role,
  workspaceId,
  canManage,
}: {
  role: Role;
  workspaceId: string;
  canManage: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const isProtected = PROTECTED_ROLES.includes(role.name);

  if (editing && canManage && !isProtected) {
    return (
      <RoleForm
        workspaceId={workspaceId}
        roleId={role.id}
        defaultName={role.name}
        defaultColor={role.color}
        defaultPermissions={role.permissions}
        memberCount={role._count.members}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="group rounded-md border border-border bg-bg-elevated/60 px-3 py-2 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield size={12} style={{ color: role.color }} />
          <span className="text-xs font-medium" style={{ color: role.color }}>
            {role.name}
          </span>
          {isProtected && (
            <span className="rounded bg-bg-secondary px-1 py-px text-[10px] text-fg-muted">
              Default
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-fg-muted">
            {role._count.members} member{role._count.members !== 1 && "s"}
          </span>
          {canManage && !isProtected && (
            <button
              onClick={() => setEditing(true)}
              className="hidden rounded p-0.5 text-fg-muted hover:text-fg-secondary group-hover:block"
            >
              <Pencil size={11} />
            </button>
          )}
        </div>
      </div>
      <div className="mt-1 flex flex-wrap gap-1">
        {(Object.entries(Permission) as [PermissionKey, number][]).map(
          ([key, val]) =>
            hasPermission(role.permissions, val) ? (
              <span
                key={key}
                className="rounded bg-bg-secondary px-1.5 py-0.5 text-[10px] text-fg-muted"
              >
                {PERMISSION_LABELS[key]}
              </span>
            ) : null,
        )}
      </div>
    </div>
  );
}

function CreateRoleForm({
  workspaceId,
  onClose,
}: {
  workspaceId: string;
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState(
    async (prev: unknown, formData: FormData) => {
      const result = await createRole(prev, formData);
      if (result?.success) onClose();
      return result;
    },
    null,
  );

  return (
    <RoleForm
      workspaceId={workspaceId}
      defaultName=""
      defaultColor="#6B7280"
      defaultPermissions={3} // CREATE_CONTENT | EDIT_CONTENT
      onCancel={onClose}
      externalAction={action}
      externalPending={pending}
      externalError={state?.error}
    />
  );
}

function RoleForm({
  workspaceId,
  roleId,
  defaultName,
  defaultColor,
  defaultPermissions,
  memberCount,
  onCancel,
  externalAction,
  externalPending,
  externalError,
}: {
  workspaceId: string;
  roleId?: string;
  defaultName: string;
  defaultColor: string;
  defaultPermissions: number;
  memberCount?: number;
  onCancel: () => void;
  externalAction?: (formData: FormData) => void;
  externalPending?: boolean;
  externalError?: string | null;
}) {
  const [color, setColor] = useState(defaultColor);
  const [perms, setPerms] = useState(defaultPermissions);

  const [editState, editAction, editPending] = useActionState(
    async (prev: unknown, formData: FormData) => {
      const result = await updateRole(prev, formData);
      if (result?.success) onCancel();
      return result;
    },
    null,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteRole,
    null,
  );

  const action = externalAction ?? editAction;
  const pending = externalPending ?? editPending;
  const error = externalError ?? editState?.error;
  const isCreate = !roleId;

  function togglePerm(bit: number) {
    setPerms((p) => (p & bit ? p & ~bit : p | bit));
  }

  return (
    <form
      action={action}
      className="rounded-md border border-border bg-bg-elevated/80 p-3 backdrop-blur-sm"
    >
      <input type="hidden" name="workspaceId" value={workspaceId} />
      {roleId && <input type="hidden" name="roleId" value={roleId} />}
      <input type="hidden" name="color" value={color} />
      <input type="hidden" name="permissions" value={perms.toString()} />

      {error && (
        <p className="mb-2 text-[11px] text-accent-emphasis">{error}</p>
      )}
      {deleteState?.error && (
        <p className="mb-2 text-[11px] text-accent-emphasis">
          {deleteState.error}
        </p>
      )}

      {/* Name + color preview */}
      <div className="mb-3 flex items-center gap-2">
        <div
          className="h-5 w-5 shrink-0 rounded-full border border-border"
          style={{ backgroundColor: color }}
        />
        <input
          name="name"
          defaultValue={defaultName}
          required
          placeholder="Role name"
          className="flex-1 rounded border border-border bg-bg-primary px-2 py-1 font-mono text-xs text-fg-primary placeholder-fg-muted focus:border-accent focus:outline-none"
          autoFocus
        />
      </div>

      {/* Color presets */}
      <div className="mb-3">
        <p className="mb-1 text-[11px] text-fg-muted">Color</p>
        <div className="flex flex-wrap gap-1">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`h-4 w-4 rounded-full border transition-transform hover:scale-110 ${
                color === c
                  ? "border-fg-primary scale-110"
                  : "border-transparent"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {/* Permissions */}
      <div className="mb-3">
        <p className="mb-1 text-[11px] text-fg-muted">Permissions</p>
        <div className="space-y-1">
          {(Object.entries(Permission) as [PermissionKey, number][]).map(
            ([key, val]) => (
              <label
                key={key}
                className="flex items-center gap-2 rounded px-1.5 py-0.5 text-xs text-fg-primary hover:bg-bg-secondary cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={(perms & val) === val}
                  onChange={() => togglePerm(val)}
                  className="rounded border-border text-accent focus:ring-accent/50"
                />
                {PERMISSION_LABELS[key]}
              </label>
            ),
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        {/* Delete (edit mode only) */}
        {roleId && (
          <form action={deleteAction}>
            <input type="hidden" name="roleId" value={roleId} />
            <input type="hidden" name="workspaceId" value={workspaceId} />
            <button
              type="submit"
              disabled={deletePending || (memberCount ?? 0) > 0}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs text-fg-muted hover:text-accent-emphasis disabled:opacity-40"
              title={
                (memberCount ?? 0) > 0
                  ? "Reassign members before deleting"
                  : "Delete role"
              }
              onClick={(e) => {
                if (!confirm(`Delete role "${defaultName}"?`))
                  e.preventDefault();
              }}
            >
              <Trash2 size={11} />
              Delete
            </button>
          </form>
        )}
        {!roleId && <div />}

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
            {pending ? "..." : isCreate ? "Create" : "Save"}
          </button>
        </div>
      </div>
    </form>
  );
}
