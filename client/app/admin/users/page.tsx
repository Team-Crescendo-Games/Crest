"use client";

import { useState } from "react";
import {
  useGetAuthUserQuery,
  useGetUsersQuery,
  useAdminUpdateUserMutation,
  useAdminCreateUserMutation,
  useAdminDeleteUserMutation,
  User,
} from "@/state/api";
import { useAppDispatch, useAppSelector } from "@/app/redux";
import { setImpersonatedUser } from "@/state";
import { isAdminUser } from "@/lib/adminAllowlist";
import Header from "@/components/Header";
import {
  Save,
  X,
  Pencil,
  Loader2,
  UserCheck,
  LogOut,
  Copy,
  Check,
  Plus,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react";

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

const AdminUsersPage = () => {
  const dispatch = useAppDispatch();
  const impersonatedUser = useAppSelector(
    (state) => state.global.impersonatedUser,
  );
  // Always get the REAL user for admin check (pass empty string to skip impersonation)
  const { data: authData, isLoading: authLoading } = useGetAuthUserQuery({
    impersonatedCognitoId: "",
  });
  const { data: users, isLoading: usersLoading } = useGetUsersQuery();
  const [adminUpdateUser] = useAdminUpdateUserMutation();
  const [adminCreateUser] = useAdminCreateUserMutation();
  const [adminDeleteUser] = useAdminDeleteUserMutation();

  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    username: "",
    fullName: "",
    cognitoId: "",
    email: "",
  });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    username: "",
    fullName: "",
    cognitoId: "",
    email: "",
  });
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 20;

  // Use the real auth user's email for admin check (not impersonated)
  const currentUserEmail = authData?.userDetails?.email;
  const isAdmin = isAdminUser(currentUserEmail);

  const handleSwitchToUser = (user: User) => {
    if (!user.cognitoId || !user.userId) return;
    dispatch(
      setImpersonatedUser({
        cognitoId: user.cognitoId,
        userId: user.userId,
        username: user.username,
        email: user.email,
      }),
    );
  };

  const handleStopImpersonating = () => {
    dispatch(setImpersonatedUser(null));
  };

  if (authLoading || usersLoading) {
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

  const startEdit = (user: User) => {
    setEditingUserId(user.userId!);
    setEditForm({
      username: user.username,
      fullName: user.fullName || "",
      cognitoId: user.cognitoId || "",
      email: user.email || "",
    });
    setError(null);
  };

  const cancelEdit = () => {
    setEditingUserId(null);
    setError(null);
  };

  const saveEdit = async (userId: number) => {
    setSaving(true);
    setError(null);
    try {
      await adminUpdateUser({
        userId,
        username: editForm.username,
        fullName: editForm.fullName || undefined,
        cognitoId: editForm.cognitoId,
        email: editForm.email || undefined,
      }).unwrap();
      setEditingUserId(null);
    } catch (err: any) {
      setError(err.data?.message || "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-dark-tertiary dark:text-white";

  const handleCreateUser = async () => {
    if (!createForm.username || !createForm.cognitoId) {
      setError("Username and Cognito ID are required");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      await adminCreateUser({
        username: createForm.username,
        cognitoId: createForm.cognitoId,
        fullName: createForm.fullName || undefined,
        email: createForm.email || undefined,
      }).unwrap();
      setCreateForm({ username: "", fullName: "", cognitoId: "", email: "" });
      setShowCreateForm(false);
    } catch (err: any) {
      setError(err.data?.message || "Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    setError(null);
    try {
      await adminDeleteUser(userId).unwrap();
      setDeletingUserId(null);
    } catch (err: any) {
      setError(err.data?.message || "Failed to delete user");
    }
  };

  return (
    <div className="p-8">
      <Header name="Admin: User Management" />

      {impersonatedUser && (
        <div className="mb-4 flex items-center justify-between rounded bg-amber-100 p-3 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
          <span>
            Currently viewing as: <strong>{impersonatedUser.username}</strong> (
            {impersonatedUser.email})
          </span>
          <button
            onClick={handleStopImpersonating}
            className="flex items-center gap-1 rounded bg-amber-600 px-3 py-1 text-sm text-white hover:bg-amber-700"
          >
            <LogOut className="h-4 w-4" />
            Stop Impersonating
          </button>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded bg-red-100 p-3 text-red-700 dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="mb-4">
        {!showCreateForm ? (
          <button
            onClick={() => { setShowCreateForm(true); setError(null); }}
            className="flex items-center gap-2 rounded bg-gray-800 px-4 py-2 text-sm text-white hover:bg-gray-700 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-200"
          >
            <Plus className="h-4 w-4" />
            Create User
          </button>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow dark:border-gray-700 dark:bg-dark-secondary">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">New User</span>
              <button
                onClick={() => { setShowCreateForm(false); setError(null); }}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-dark-tertiary dark:hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Username *</label>
                <input
                  type="text"
                  value={createForm.username}
                  onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                  placeholder="johndoe"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Cognito ID *</label>
                <input
                  type="text"
                  value={createForm.cognitoId}
                  onChange={(e) => setCreateForm({ ...createForm, cognitoId: e.target.value })}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className={`${inputClass} font-mono text-xs`}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Full Name</label>
                <input
                  type="text"
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                  placeholder="John Doe"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Email</label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="john@example.com"
                  className={inputClass}
                />
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleCreateUser}
                disabled={creating}
                className="flex items-center gap-2 rounded bg-green-500 px-4 py-1.5 text-sm text-white hover:bg-green-600 disabled:opacity-50"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Create
              </button>
              <button
                onClick={() => { setShowCreateForm(false); setError(null); }}
                className="rounded bg-gray-500 px-4 py-1.5 text-sm text-white hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg bg-white shadow dark:bg-dark-secondary">
        <div className="max-h-[70vh] overflow-y-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-dark-tertiary">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-200">
                ID
              </th>
              <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-200">
                Username
              </th>
              <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-200">
                Full Name
              </th>
              <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-200">
                Email
              </th>
              <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-200">
                Cognito ID
              </th>
              <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-200">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {users?.slice(page * pageSize, (page + 1) * pageSize).map((user) => (
              <tr
                key={user.userId}
                className="dark:hover:bg-dark-tertiary hover:bg-gray-50"
              >
                <td className="px-4 py-3">
                  <CopyableCell
                    value={user.userId}
                    className="text-gray-900 dark:text-white"
                  />
                </td>

                {editingUserId === user.userId ? (
                  <>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={editForm.username}
                        onChange={(e) =>
                          setEditForm({ ...editForm, username: e.target.value })
                        }
                        className={inputClass}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={editForm.fullName}
                        onChange={(e) =>
                          setEditForm({ ...editForm, fullName: e.target.value })
                        }
                        className={inputClass}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) =>
                          setEditForm({ ...editForm, email: e.target.value })
                        }
                        className={inputClass}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={editForm.cognitoId}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            cognitoId: e.target.value,
                          })
                        }
                        className={`${inputClass} font-mono text-xs`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveEdit(user.userId!)}
                          disabled={saving}
                          className="rounded bg-green-500 p-1.5 text-white hover:bg-green-600 disabled:opacity-50"
                          title="Save"
                        >
                          {saving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
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
                      <CopyableCell
                        value={user.username}
                        className="text-gray-900 dark:text-white"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <CopyableCell
                        value={user.fullName}
                        className="text-gray-600 dark:text-gray-400"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <CopyableCell
                        value={user.email}
                        className="text-gray-600 dark:text-gray-400"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <CopyableCell
                        value={user.cognitoId}
                        className="font-mono text-xs text-gray-500 dark:text-gray-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(user)}
                          className="rounded bg-blue-500 p-1.5 text-white hover:bg-blue-600"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {user.cognitoId && (
                          <button
                            onClick={() => handleSwitchToUser(user)}
                            disabled={impersonatedUser?.userId === user.userId}
                            className="rounded bg-purple-500 p-1.5 text-white hover:bg-purple-600 disabled:opacity-50"
                            title="Switch to this user"
                          >
                            <UserCheck className="h-4 w-4" />
                          </button>
                        )}
                        {deletingUserId === user.userId ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDeleteUser(user.userId!)}
                              className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeletingUserId(null)}
                              className="rounded bg-gray-500 px-2 py-1 text-xs text-white hover:bg-gray-600"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeletingUserId(user.userId!)}
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
        {users && users.length > pageSize && (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-gray-700">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, users.length)} of {users.length}
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
                onClick={() => setPage((p) => ((p + 1) * pageSize < users.length ? p + 1 : p))}
                disabled={(page + 1) * pageSize >= users.length}
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

export default AdminUsersPage;
