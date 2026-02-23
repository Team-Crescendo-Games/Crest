"use client";

import Modal from "@/components/Modal";
import { useAddWorkspaceMemberMutation } from "@/state/api";
import { useWorkspace } from "@/lib/useWorkspace";
import { useAuthUser } from "@/lib/useAuthUser";
import { useState } from "react";
import { Mail } from "lucide-react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const ModalInviteMember = ({ isOpen, onClose }: Props) => {
  const { activeWorkspaceId } = useWorkspace();
  const { data: authData } = useAuthUser();
  const currentUserId = authData?.userDetails?.userId;

  const [addWorkspaceMember, { isLoading: isInviting }] =
    useAddWorkspaceMemberMutation();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Please enter an email address.");
      return;
    }
    if (!activeWorkspaceId || !currentUserId) {
      setError("No active workspace selected.");
      return;
    }
    setError("");
    try {
      await addWorkspaceMember({
        workspaceId: activeWorkspaceId,
        email: trimmed,
        userId: currentUserId,
      }).unwrap();
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setEmail("");
        onClose();
      }, 2000);
    } catch (err) {
      const message = (err as { data?: { error?: string } })?.data?.error;
      if (message === "User does not exist") {
        setError("User does not exist.");
      } else if (message === "User is already a member of this workspace") {
        setError("This user is already a member.");
      } else {
        setError("Failed to invite user.");
      }
    }
  };

  const handleClose = () => {
    setEmail("");
    setError("");
    setSuccess(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} name="Invite Member">
      <div className="mb-4 text-sm text-gray-500 dark:text-neutral-400">
        Enter the email address of the user you want to invite.
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
            Email Address
          </label>
          <div className="relative">
            <input
              type="email"
              className={`w-full rounded border bg-white p-2 pl-9 shadow-sm focus:outline-none dark:bg-dark-tertiary dark:text-white ${
                error
                  ? "border-red-500 focus:border-red-500"
                  : "border-gray-300 focus:border-blue-500 dark:border-gray-600"
              }`}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError("");
              }}
              placeholder="user@example.com"
            />
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
          {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
          {success && (
            <p className="mt-1 text-sm text-green-500">
              Successfully added member
            </p>
          )}
        </div>
        <button
          type="submit"
          className={`mt-4 flex w-full justify-center rounded-md border border-transparent bg-gray-800 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-600 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-200 ${
            !email.trim() || isInviting || success
              ? "cursor-not-allowed opacity-50"
              : ""
          }`}
          disabled={!email.trim() || isInviting || success}
        >
          {isInviting ? "Inviting..." : "Invite"}
        </button>
      </form>
    </Modal>
  );
};

export default ModalInviteMember;
