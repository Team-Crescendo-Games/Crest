"use client";

import Modal from "@/components/Modal";
import {
  useAddWorkspaceMemberMutation,
  useGetUsersQuery,
  useGetWorkspaceMembersQuery,
} from "@/state/api";
import { useWorkspace } from "@/lib/useWorkspace";
import { useState } from "react";
import { User } from "lucide-react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const ModalInviteMember = ({ isOpen, onClose }: Props) => {
  const { activeWorkspaceId } = useWorkspace();

  // Fetch users and current members
  const { data: allUsers, isLoading: isLoadingUsers } = useGetUsersQuery();
  const { data: currentMembers } = useGetWorkspaceMembersQuery(
    activeWorkspaceId ?? 0,
    {
      skip: !activeWorkspaceId,
    },
  );

  const [addWorkspaceMember, { isLoading: isInviting }] =
    useAddWorkspaceMemberMutation();

  const [selectedUserId, setSelectedUserId] = useState<number | "">("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Filter out users who are already members of this workspace
  const availableUsers =
    allUsers?.filter(
      (user) =>
        !currentMembers?.some((member) => member.userId === user.userId),
    ) || [];

  const handleSubmit = async () => {
    if (!selectedUserId) {
      setError("Please select a user to invite.");
      return;
    }

    if (!activeWorkspaceId) {
      setError("No active workspace selected.");
      return;
    }

    setError("");

    try {
      await addWorkspaceMember({
        workspaceId: activeWorkspaceId,
        userId: Number(selectedUserId),
        role: "MEMBER",
      }).unwrap();

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setSelectedUserId("");
        onClose();
      }, 2000);
    } catch (err) {
      console.error("Failed to add member:", err);
      setError("Failed to add user to the workspace.");
    }
  };

  const handleClose = () => {
    setSelectedUserId("");
    setError("");
    setSuccess(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} name="Add Member to Workspace">
      <div className="mb-4 text-sm text-gray-500 dark:text-neutral-400">
        Select an existing user to add them to this workspace.
      </div>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Select User
          </label>
          <div className="relative">
            <select
              className={`w-full appearance-none rounded border bg-white p-2 pl-9 shadow-sm focus:outline-none dark:bg-dark-tertiary dark:text-white ${
                error
                  ? "border-red-500 focus:border-red-500"
                  : "border-gray-300 focus:border-blue-500 dark:border-gray-600"
              }`}
              value={selectedUserId}
              onChange={(e) => {
                setSelectedUserId(Number(e.target.value));
                if (error) setError("");
              }}
              disabled={isLoadingUsers || availableUsers.length === 0}
            >
              <option value="" disabled>
                {isLoadingUsers
                  ? "Loading users..."
                  : availableUsers.length === 0
                    ? "No new users available"
                    : "Choose a user..."}
              </option>
              {availableUsers.map((user) => (
                <option key={user.userId} value={user.userId}>
                  {user.username} {user.email ? `(${user.email})` : ""}
                </option>
              ))}
            </select>
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
          {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
          {success && (
            <p className="mt-1 text-sm text-green-500">
              User added successfully!
            </p>
          )}
        </div>

        <button
          type="submit"
          className={`mt-4 flex w-full justify-center rounded-md border border-transparent bg-gray-800 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-600 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-200 ${
            !selectedUserId ||
            isInviting ||
            success ||
            availableUsers.length === 0
              ? "cursor-not-allowed opacity-50"
              : ""
          }`}
          disabled={
            !selectedUserId ||
            isInviting ||
            success ||
            availableUsers.length === 0
          }
        >
          {isInviting ? "Adding..." : "Add Member"}
        </button>
      </form>
    </Modal>
  );
};

export default ModalInviteMember;
