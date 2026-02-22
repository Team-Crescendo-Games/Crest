"use client";

import { useState } from "react";
import {
  useGetAuthUserQuery,
  useAdminGetAllWorkspacesQuery,
  useAdminUpdateWorkspaceMutation,
  useAdminDeleteWorkspaceMutation,
  AdminWorkspace,
} from "@/state/api";
import { isAdminUser } from "@/lib/adminAllowlist";
import Header from "@/components/Header";
import S3Image from "@/components/S3Image";
import {
  Loader2,
  Copy,
  Check,
  Building2,
  Users,
  Pencil,
  Trash2,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const JOIN_POLICY_LABELS: Record<number, string> = {
  0: "Invite Only",
  1: "Apply to Join",
  2: "Discoverable",
};

const CopyableCell = ({
  value,
  className = "",
}: {
  value: string | number | undefined | null;
  className?: string;
}) => {
  const [copied, setCopied] = useState(false);
  const displayValue = value ?? "—";
  const hasValue = value != null && value !== "";

  const handleCopy = async () => {
    if (!hasValue) return;
    await navigator.clipboard.writeText(String(value));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="group flex items-center gap-1.5">
      <span className={className}>{displayValue}</span>
      {hasValue && (
        <button
          onClick={handleCopy}
          className="text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-gray-600 dark:hover:text-gray-300"
          title="Copy"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      )}
    </div>
  );
};

const AdminWorkspacesPage = () => {
  const { data: authData, isLoading: authLoading } = useGetAuthUserQuery({
    impersonatedCognitoId: "",
  });
  const { data: workspaces, isLoading: workspacesLoading } =
    useAdminGetAllWorkspacesQuery();
  const [adminUpdateWorkspace] = useAdminUpdateWorkspaceMutation();
  const [adminDeleteWorkspace] = useAdminDeleteWorkspaceMutation();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    joinPolicy: 0,
    createdById: "",
  });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const currentUserEmail = authData?.userDetails?.email;
  const isAdmin = isAdminUser(currentUserEmail);

  if (authLoading || workspacesLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-red-500">
          Access denied. Admin privileges required.
        </p>
      </div>
    );
  }

  const startEdit = (ws: AdminWorkspace) => {
    setEditingId(ws.id);
    setEditForm({
      name: ws.name,
      description: ws.description || "",
      joinPolicy: ws.joinPolicy ?? 0,
      createdById: ws.createdById?.toString() || "",
    });
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setError(null);
  };

  const saveEdit = async (workspaceId: number) => {
    setSaving(true);
    setError(null);
    try {
      await adminUpdateWorkspace({
        workspaceId,
        name: editForm.name,
        description: editForm.description,
        joinPolicy: editForm.joinPolicy,
        createdById: editForm.createdById ? Number(editForm.createdById) : null,
      }).unwrap();
      setEditingId(null);
    } catch (err: any) {
      setError(err.data?.error || "Failed to update workspace");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (workspaceId: number) => {
    setError(null);
    try {
      await adminDeleteWorkspace(workspaceId).unwrap();
      setDeletingId(null);
    } catch (err: any) {
      setError(err.data?.error || "Failed to delete workspace");
    }
  };

  const inputClass =
    "w-full rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-dark-tertiary dark:text-white";

  return (
    <div className="p-8">
      <Header name="Admin: Workspaces" />

      {error && (
        <div className="mb-4 rounded bg-red-100 p-3 text-red-700 dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg bg-white shadow dark:bg-dark-secondary">
        <div className="max-h-[70vh] overflow-y-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-dark-tertiary">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-200">ID</th>
              <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-200">Workspace</th>
              <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-200">Description</th>
              <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-200">Created By</th>
              <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-200">Members</th>
              <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-200">Join Policy</th>
              <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-200">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {workspaces?.slice(page * pageSize, (page + 1) * pageSize).map((ws) => (
              <tr key={ws.id} className="hover:bg-gray-50 dark:hover:bg-dark-tertiary">
                <td className="px-4 py-3">
                  <CopyableCell value={ws.id} className="text-gray-900 dark:text-white" />
                </td>

                {editingId === ws.id ? (
                  <>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className={inputClass}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        className={inputClass}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={editForm.createdById}
                        onChange={(e) => setEditForm({ ...editForm, createdById: e.target.value })}
                        placeholder="User ID"
                        className={inputClass}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                        <Users className="h-3.5 w-3.5" />
                        {ws._count?.members ?? "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={editForm.joinPolicy}
                        onChange={(e) => setEditForm({ ...editForm, joinPolicy: Number(e.target.value) })}
                        className={inputClass}
                      >
                        <option value={0}>Invite Only</option>
                        <option value={1}>Apply to Join</option>
                        <option value={2}>Discoverable</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveEdit(ws.id)}
                          disabled={saving}
                          className="rounded bg-green-500 p-1.5 text-white hover:bg-green-600 disabled:opacity-50"
                          title="Save"
                        >
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="rounded bg-gray-500 p-1.5 text-white hover:bg-gray-600"
                          title="Cancel"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {ws.iconExt ? (
                          <S3Image
                            s3Key={`workspaces/${ws.id}/icon.${ws.iconExt}`}
                            alt={ws.name}
                            width={24}
                            height={24}
                            className="h-6 w-6 rounded object-cover"
                            fallbackType="image"
                          />
                        ) : (
                          <div className="flex h-6 w-6 items-center justify-center rounded bg-gray-200 dark:bg-dark-tertiary">
                            <Building2 className="h-3.5 w-3.5 text-gray-400" />
                          </div>
                        )}
                        <span className="font-medium text-gray-900 dark:text-white">{ws.name}</span>
                      </div>
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-gray-600 dark:text-gray-400">
                      {ws.description || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {ws.createdBy ? (
                        <div className="flex flex-col">
                          <span className="text-gray-900 dark:text-white">{ws.createdBy.username}</span>
                          <span className="text-xs text-gray-500">{ws.createdBy.email || `ID: ${ws.createdById}`}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                        <Users className="h-3.5 w-3.5" />
                        {ws._count?.members ?? "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-dark-tertiary dark:text-gray-400">
                        {JOIN_POLICY_LABELS[ws.joinPolicy ?? 0] ?? "Unknown"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(ws)}
                          className="rounded bg-blue-500 p-1.5 text-white hover:bg-blue-600"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {deletingId === ws.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(ws.id)}
                              className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeletingId(null)}
                              className="rounded bg-gray-500 px-2 py-1 text-xs text-white hover:bg-gray-600"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeletingId(ws.id)}
                            className="rounded bg-red-500 p-1.5 text-white hover:bg-red-600"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {workspaces && workspaces.length > pageSize && (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-gray-700">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, workspaces.length)} of {workspaces.length}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded border border-gray-300 p-1.5 text-gray-600 hover:bg-gray-100 disabled:opacity-40 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-dark-tertiary"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => ((p + 1) * pageSize < workspaces.length ? p + 1 : p))}
                disabled={(page + 1) * pageSize >= workspaces.length}
                className="rounded border border-gray-300 p-1.5 text-gray-600 hover:bg-gray-100 disabled:opacity-40 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-dark-tertiary"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminWorkspacesPage;
