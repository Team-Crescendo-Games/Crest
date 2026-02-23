"use client";

import { useState, memo } from "react";
import {
  useGetWorkspaceMembersQuery,
  useGetRolesQuery,
  useGetWorkspacesQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
  useUpdateMemberRoleMutation,
  useGetWorkspaceApplicationsQuery,
  useResolveApplicationMutation,
  useGetInvitationsQuery,
  useCreateInvitationMutation,
  useDeleteInvitationMutation,
  type Role,
  type WorkspaceMember,
  type WorkspaceApplication,
  type WorkspaceInvitation,
} from "@/state/api";
import Header from "@/components/Header";
import UserCard from "@/components/UserCard";
import UserIcon from "@/components/UserIcon";
import Modal from "@/components/Modal";
import { useWorkspace } from "@/lib/useWorkspace";
import { usePermissions } from "@/lib/usePermissions";
import { useAuthUser } from "@/lib/useAuthUser";
import { useAppDispatch } from "@/app/redux";
import { showNotification } from "@/state";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { Plus, Pencil, Trash2, Shield, Users as UsersIcon, X, UserPlus, Check, XCircle, Copy, KeyRound } from "lucide-react";
import ModalInviteMember from "@/components/workspaces/modalInviteMember";

type Tab = "members" | "roles" | "applications" | "invitations";

const PERMISSION_LABELS: { key: keyof typeof PERMISSIONS; label: string }[] = [
  { key: "DELETE", label: "Delete Workspace" },
  { key: "EDIT_INFO", label: "Edit Workspace" },
  { key: "INVITE", label: "Invite Members" },
  { key: "EDIT_MEMBER_ROLES", label: "Manage Roles" },
  { key: "MANAGE_APPLICATIONS", label: "Manage Applications" },
];

const COLOR_SWATCHES = [
  "#6B7280",
  "#EF4444",
  "#F59E0B",
  "#10B981",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
];

const PERMISSION_SHORT_LABELS: Record<keyof typeof PERMISSIONS, string> = {
  DELETE: "Delete",
  EDIT_INFO: "Edit",
  INVITE: "Invite",
  EDIT_MEMBER_ROLES: "Roles",
  MANAGE_APPLICATIONS: "Apps",
};

function getPermissionSummary(permissions: number): string {
  const granted = PERMISSION_LABELS.filter(({ key }) =>
    hasPermission(permissions, PERMISSIONS[key]),
  ).map(({ key }) => PERMISSION_SHORT_LABELS[key]);
  return granted.length > 0 ? granted.join(", ") : "No permissions";
}

// --- Role Modal ---
function RoleModal({
  isOpen,
  onClose,
  onSave,
  initialRole,
  readOnly = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; color: string; permissions: number }) => void;
  initialRole?: Role;
  readOnly?: boolean;
}) {
  const [name, setName] = useState(initialRole?.name ?? "");
  const [color, setColor] = useState(initialRole?.color ?? COLOR_SWATCHES[0]);
  const [perms, setPerms] = useState(initialRole?.permissions ?? 0);

  const togglePerm = (bit: number) => {
    if (readOnly) return;
    setPerms((prev) => (prev & bit ? prev & ~bit : prev | bit));
  };

  const handleSave = () => {
    if (!name.trim() || readOnly) return;
    onSave({ name: name.trim(), color, permissions: perms });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} name={readOnly ? "View Role" : initialRole ? "Edit Role" : "Create Role"}>
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Name
          </label>
          <input
            value={name}
            onChange={(e) => !readOnly && setName(e.target.value)}
            placeholder="Role name"
            readOnly={readOnly}
            className={`w-full rounded border border-gray-300 p-2 dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white ${readOnly ? "cursor-default opacity-70" : ""}`}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Color
          </label>
          <div className="flex gap-2">
            {COLOR_SWATCHES.map((c) => (
              <button
                key={c}
                onClick={() => !readOnly && setColor(c)}
                className={`h-8 w-8 rounded-full border-2 ${color === c ? "border-gray-900 dark:border-white" : "border-transparent"} ${readOnly ? "cursor-default" : ""}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Permissions
          </label>
          <div className="flex flex-col gap-2">
            {PERMISSION_LABELS.map(({ key, label }) => (
              <label key={key} className={`flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 ${readOnly ? "cursor-default" : ""}`}>
                <input
                  type="checkbox"
                  checked={hasPermission(perms, PERMISSIONS[key])}
                  onChange={() => togglePerm(PERMISSIONS[key])}
                  disabled={readOnly}
                  className="h-4 w-4 rounded"
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        {!readOnly && (
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="rounded border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-stroke-dark dark:text-gray-300 dark:hover:bg-dark-tertiary"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!name.trim()}
              className="rounded bg-gray-800 px-4 py-2 text-white hover:bg-gray-700 disabled:opacity-50 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-200"
            >
              {initialRole ? "Save" : "Create"}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

// --- Members Tab ---
function MembersTab({
  members,
  canInvite,
}: {
  members: WorkspaceMember[];
  canInvite: boolean;
}) {
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  return (
    <div>
      {canInvite && (
        <div className="mb-4">
          <button
            onClick={() => setIsInviteOpen(true)}
            className="inline-flex items-center gap-1 rounded bg-gray-800 px-4 py-2 text-sm text-white hover:bg-gray-700 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-200"
          >
            <UserPlus size={16} />
            Invite Member
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {members.map((member) => (
          <div key={member.userId}>
            <UserCard user={member.user!} />
          </div>
        ))}
      </div>
      <ModalInviteMember isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} />
    </div>
  );
}

// --- Member Row (memoized to prevent re-renders that trigger S3 refetches) ---
const MemberRow = memo(function MemberRow({ m, action }: { m: WorkspaceMember; action: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded px-2 py-2 hover:bg-gray-50 dark:hover:bg-dark-tertiary">
      <UserIcon
        userId={m.user?.userId}
        username={m.user?.username || ""}
        fullName={m.user?.fullName}
        profilePictureExt={m.user?.profilePictureExt}
        size={32}
      />
      <div className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-gray-800 dark:text-white">
          {m.user?.fullName || m.user?.username || `User ${m.userId}`}
        </span>
        {m.user?.email && (
          <span className="block truncate text-xs text-gray-500 dark:text-neutral-400">
            {m.user.email}
          </span>
        )}
      </div>
      {action}
    </div>
  );
});

// --- Role Members Modal ---
function RoleMembersModal({
  isOpen,
  onClose,
  role,
  allMembers,
  creatorUserId,
  workspaceId,
  currentUserId,
  readOnly = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  role: Role;
  allMembers: WorkspaceMember[];
  creatorUserId: number | undefined;
  workspaceId: number;
  currentUserId: number | undefined;
  readOnly?: boolean;
}) {
  const [updateMemberRole] = useUpdateMemberRoleMutation();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const assignedMembers = allMembers.filter((m) => m.roleId === role.id);
  const unassignedMembers = allMembers.filter(
    (m) => m.roleId !== role.id && m.userId !== creatorUserId,
  );

  const filterBySearch = (m: WorkspaceMember) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (m.user?.fullName?.toLowerCase().includes(q) ?? false) ||
      (m.user?.username?.toLowerCase().includes(q) ?? false) ||
      (m.user?.email?.toLowerCase().includes(q) ?? false)
    );
  };

  const filteredAssigned = assignedMembers.filter(filterBySearch);
  const filteredUnassigned = unassignedMembers.filter(filterBySearch);

  const handleAssign = async (targetUserId: number) => {
    if (!currentUserId) return;
    await updateMemberRole({ workspaceId, targetUserId, roleId: role.id, userId: currentUserId });
  };

  const handleRemove = async (targetUserId: number, fallbackRoleId: number) => {
    if (!currentUserId) return;
    await updateMemberRole({ workspaceId, targetUserId, roleId: fallbackRoleId, userId: currentUserId });
  };

  const memberRole = allMembers.find((m) => m.role?.name === "Member")?.role;

  return (
    <Modal isOpen={isOpen} onClose={onClose} name={`Members — ${role.name}`}>
      <div className="flex flex-col gap-4">
        {/* Search */}
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") setSearch(searchInput);
          }}
          placeholder="Search members... (press Enter)"
          className="w-full rounded border border-gray-300 p-2 text-sm dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white"
        />

        {/* Currently assigned */}
        <div>
          <h4 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            Assigned ({assignedMembers.length})
          </h4>
          {filteredAssigned.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-neutral-500">
              {search.trim() ? "No matches" : "No members assigned"}
            </p>
          ) : (
            <div className="flex flex-col gap-0.5">
              {filteredAssigned.map((m) => (
                <MemberRow
                  key={m.userId}
                  m={m}
                  action={
                    !readOnly && m.userId !== creatorUserId && m.userId !== currentUserId && memberRole ? (
                      <button
                        onClick={() => handleRemove(m.userId, memberRole.id)}
                        className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-500 dark:hover:bg-dark-tertiary dark:hover:text-red-400"
                        title="Remove from role"
                      >
                        <X size={14} />
                      </button>
                    ) : null
                  }
                />
              ))}
            </div>
          )}
        </div>

        {/* Available to add */}
        {!readOnly && unassignedMembers.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Add members
            </h4>
            {filteredUnassigned.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-neutral-500">No matches</p>
            ) : (
              <div className="flex flex-col gap-0.5">
                {filteredUnassigned.map((m) => (
                  <MemberRow
                    key={m.userId}
                    m={m}
                    action={
                      <button
                        onClick={() => handleAssign(m.userId)}
                        className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-green-600 dark:hover:bg-dark-tertiary dark:hover:text-green-400"
                        title="Add to role"
                      >
                        <Plus size={14} />
                      </button>
                    }
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

// --- Roles Tab ---
function RolesTab({
  roles,
  canEditMemberRoles,
  workspaceId,
  allMembers,
  creatorUserId,
  currentUserId,
}: {
  roles: Role[];
  canEditMemberRoles: boolean;
  workspaceId: number;
  allMembers: WorkspaceMember[];
  creatorUserId: number | undefined;
  currentUserId: number | undefined;
}) {
  const [createRole] = useCreateRoleMutation();
  const [updateRole] = useUpdateRoleMutation();
  const [deleteRole] = useDeleteRoleMutation();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | undefined>(undefined);
  const [membersModalRole, setMembersModalRole] = useState<Role | undefined>(undefined);
  const dispatch = useAppDispatch();

  const handleCreate = () => {
    setEditingRole(undefined);
    setModalOpen(true);
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setModalOpen(true);
  };

  const handleDelete = async (roleId: number) => {
    if (!currentUserId) return;
    try {
      await deleteRole({ workspaceId, roleId, userId: currentUserId }).unwrap();
    } catch {
      dispatch(showNotification({ message: "Cannot delete this role — reassign its members to another role first.", type: "error" }));
    }
  };

  const handleSave = async (data: { name: string; color: string; permissions: number }) => {
    if (!currentUserId) return;
    if (editingRole) {
      await updateRole({ workspaceId, roleId: editingRole.id, userId: currentUserId, ...data });
    } else {
      await createRole({ workspaceId, userId: currentUserId, ...data });
    }
    setModalOpen(false);
    setEditingRole(undefined);
  };

  const currentMember = allMembers.find((m) => m.userId === currentUserId);
  const currentRoleId = currentMember?.roleId;

  return (
    <div>
      {/* Current user's role */}
      {currentMember?.role && (
        <div className="mb-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <span>Your role:</span>
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
            style={{ backgroundColor: currentMember.role.color }}
          >
            {currentMember.role.name}
          </span>
        </div>
      )}

      {canEditMemberRoles && (
        <div className="mb-4">
          <button
            onClick={handleCreate}
            className="inline-flex items-center gap-1 rounded bg-gray-800 px-4 py-2 text-sm text-white hover:bg-gray-700 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-200"
          >
            <Plus size={16} />
            Create Role
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => (
          <div
            key={role.id}
            onClick={() => {
              setEditingRole(role);
              setModalOpen(true);
            }}
            className="cursor-pointer rounded-md bg-white p-4 shadow transition-colors hover:bg-gray-50 dark:bg-dark-secondary dark:hover:bg-dark-tertiary"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="h-4 w-4 rounded-full"
                  style={{ backgroundColor: role.color }}
                />
                <span className="font-medium text-gray-900 dark:text-white">
                  {role.name}
                </span>
              </div>
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <div className="group relative">
                  <button
                    onClick={() => setMembersModalRole(role)}
                    className="rounded p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-dark-tertiary"
                  >
                    <UsersIcon size={14} />
                  </button>
                  <span className="pointer-events-none absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                    Members
                  </span>
                </div>
                {canEditMemberRoles && role.name !== "Owner" && role.name !== "Admin" && role.name !== "Member" && (
                  <>
                    <div className="group relative">
                      <button
                        onClick={() => handleEdit(role)}
                        className="rounded p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-dark-tertiary"
                      >
                        <Pencil size={14} />
                      </button>
                      <span className="pointer-events-none absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                        Edit
                      </span>
                    </div>
                    <div className="group relative">
                      <button
                        onClick={() => handleDelete(role.id)}
                        className="rounded p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-dark-tertiary"
                      >
                        <Trash2 size={14} />
                      </button>
                      <span className="pointer-events-none absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                        Delete
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-neutral-400">
              {getPermissionSummary(role.permissions)}
            </p>
          </div>
        ))}
      </div>

      <RoleModal
        key={editingRole?.id ?? "new"}
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingRole(undefined);
        }}
        onSave={handleSave}
        initialRole={editingRole}
        readOnly={!canEditMemberRoles || editingRole?.name === "Owner" || editingRole?.name === "Admin" || editingRole?.name === "Member"}
      />

      {membersModalRole && (
        <RoleMembersModal
          isOpen={!!membersModalRole}
          onClose={() => setMembersModalRole(undefined)}
          role={membersModalRole}
          allMembers={allMembers}
          creatorUserId={creatorUserId}
          workspaceId={workspaceId}
          currentUserId={currentUserId}
          readOnly={!canEditMemberRoles}
        />
      )}
    </div>
  );
}

function ApplicationsTab({
  workspaceId,
  currentUserId,
}: {
  workspaceId: number;
  currentUserId: number | undefined;
}) {
  const { data: applications, isLoading } = useGetWorkspaceApplicationsQuery(
    { workspaceId, userId: currentUserId!, status: 0 },
    { skip: !currentUserId },
  );
  const [resolveApplication] = useResolveApplicationMutation();

  const handleResolve = async (applicationId: number, action: "approve" | "reject") => {
    if (!currentUserId) return;
    await resolveApplication({ workspaceId, applicationId, action, userId: currentUserId });
  };

  if (isLoading) return <p className="text-sm text-gray-500 dark:text-neutral-400">Loading...</p>;
  if (!applications || applications.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-neutral-400">No pending applications.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {applications.map((app) => (
        <div
          key={app.id}
          className="flex items-center gap-3 rounded-md bg-white p-4 shadow dark:bg-dark-secondary"
        >
          <UserIcon
            userId={app.user?.userId}
            username={app.user?.username}
            fullName={app.user?.fullName}
            profilePictureExt={app.user?.profilePictureExt}
            size={32}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {app.user?.fullName || app.user?.username || "Unknown"}
            </p>
            <p className="text-xs text-gray-500 dark:text-neutral-400">
              {app.user?.email}
            </p>
            {app.message && (
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 italic">
                &ldquo;{app.message}&rdquo;
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={() => handleResolve(app.id, "approve")}
              className="rounded p-1.5 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
              title="Approve"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleResolve(app.id, "reject")}
              className="rounded p-1.5 text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              title="Reject"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Invitations Tab ---
const InvitationsTab = ({
  workspaceId,
  userId,
}: {
  workspaceId: number;
  userId: number;
}) => {
  const { data: invitations } = useGetInvitationsQuery(
    { workspaceId, userId },
    { skip: !workspaceId || !userId },
  );
  const [createInvitation, { isLoading: isCreating }] = useCreateInvitationMutation();
  const [deleteInvitation] = useDeleteInvitationMutation();
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCreate = async () => {
    try {
      await createInvitation({ workspaceId, userId, expiresInDays }).unwrap();
    } catch (err) {
      console.error("Failed to create invitation:", err);
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <label className="text-xs text-gray-500 dark:text-neutral-400">Expires in</label>
        <select
          value={expiresInDays}
          onChange={(e) => setExpiresInDays(Number(e.target.value))}
          className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white"
        >
          {[1, 3, 7, 14, 30, 60, 90].map((d) => (
            <option key={d} value={d}>{d} day{d > 1 ? "s" : ""}</option>
          ))}
        </select>
        <button
          onClick={handleCreate}
          disabled={isCreating}
          className="inline-flex cursor-pointer items-center gap-1 rounded bg-gray-800 px-3 py-1.5 text-xs text-white hover:bg-gray-700 disabled:opacity-50 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-200"
        >
          <Plus className="h-3 w-3" />
          {isCreating ? "Creating..." : "Generate Link"}
        </button>
      </div>

      {!invitations || invitations.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500 dark:text-neutral-400">
          No invitation links yet. Generate one to share with others.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {invitations.map((inv) => {
            const isExpired = new Date(inv.expiresAt) < new Date();
            return (
              <div
                key={inv.id}
                className={`flex items-center gap-3 rounded-md border p-3 ${
                  isExpired
                    ? "border-red-200 bg-red-50/50 dark:border-red-500/20 dark:bg-red-500/5"
                    : "border-gray-200 dark:border-stroke-dark"
                }`}
              >
                <KeyRound className="h-4 w-4 shrink-0 text-gray-400" />
                <code className="min-w-0 flex-1 truncate text-xs text-gray-700 dark:text-gray-300">
                  {inv.id}
                </code>
                <span className="shrink-0 text-xs text-gray-500 dark:text-neutral-400">
                  {inv.createdBy?.username && `by ${inv.createdBy.username}`}
                </span>
                <span className={`shrink-0 text-xs ${isExpired ? "text-red-500" : "text-gray-500 dark:text-neutral-400"}`}>
                  {isExpired ? "Expired" : `Expires ${new Date(inv.expiresAt).toLocaleDateString()}`}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(inv.id);
                    setCopiedId(inv.id);
                    setTimeout(() => setCopiedId(null), 2000);
                  }}
                  className="shrink-0 cursor-pointer rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-dark-tertiary dark:hover:text-gray-200"
                  title="Copy invitation ID"
                >
                  {copiedId === inv.id ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={async () => {
                    try {
                      await deleteInvitation({ workspaceId, invitationId: inv.id, userId }).unwrap();
                    } catch (err) {
                      console.error("Failed to delete invitation:", err);
                    }
                  }}
                  className="shrink-0 cursor-pointer rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                  title="Revoke invitation"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// --- Main Page ---
const Users = () => {
  const [activeTab, setActiveTab] = useState<Tab>("members");
  const { activeWorkspaceId } = useWorkspace();
  const { canEditMemberRoles, canInvite, canManageApplications } = usePermissions();
  const { data: authData } = useAuthUser();
  const userId = authData?.userDetails?.userId;

  const {
    data: members,
    isLoading: membersLoading,
    isError: membersError,
  } = useGetWorkspaceMembersQuery(activeWorkspaceId!, {
    skip: !activeWorkspaceId,
  });

  const { data: roles, isLoading: rolesLoading } = useGetRolesQuery(
    activeWorkspaceId!,
    { skip: !activeWorkspaceId },
  );

  const { data: workspaces } = useGetWorkspacesQuery(userId!, {
    skip: !userId,
  });

  const activeWorkspace = workspaces?.find((w) => w.id === activeWorkspaceId);
  const creatorUserId = activeWorkspace?.createdById ?? undefined;

  if (membersLoading || rolesLoading) return <div className="p-8">Loading...</div>;
  if (membersError || !members) return <div className="p-8">Error fetching users</div>;

  const tabClass = (tab: Tab) =>
    `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      activeTab === tab
        ? "border-gray-800 text-gray-800 dark:border-white dark:text-white"
        : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
    }`;

  return (
    <div className="flex w-full flex-col p-8">
      <Header
        name="Team Directory"
        buttonComponent={
          <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
            <Shield size={16} />
          </div>
        }
      />

      {/* Tabs */}
      <div className="mb-6 flex border-b border-gray-200 dark:border-stroke-dark">
        <button className={tabClass("members")} onClick={() => setActiveTab("members")}>
          Members
        </button>
        <button className={tabClass("roles")} onClick={() => setActiveTab("roles")}>
          Roles
        </button>
        {canManageApplications && (
          <button className={tabClass("applications")} onClick={() => setActiveTab("applications")}>
            Applications
          </button>
        )}
        {canInvite && (
          <button className={tabClass("invitations")} onClick={() => setActiveTab("invitations")}>
            Invitations
          </button>
        )}
      </div>

      {/* Tab content */}
      {activeTab === "members" && (
        <MembersTab
          members={members}
          canInvite={canInvite}
        />
      )}
      {activeTab === "roles" && (
        <RolesTab
          roles={roles ?? []}
          canEditMemberRoles={canEditMemberRoles}
          workspaceId={activeWorkspaceId!}
          allMembers={members}
          creatorUserId={creatorUserId}
          currentUserId={userId}
        />
      )}
      {activeTab === "applications" && canManageApplications && (
        <ApplicationsTab
          workspaceId={activeWorkspaceId!}
          currentUserId={userId}
        />
      )}
      {activeTab === "invitations" && canInvite && (
        <InvitationsTab
          workspaceId={activeWorkspaceId!}
          userId={userId!}
        />
      )}
    </div>
  );
};

export default Users;
