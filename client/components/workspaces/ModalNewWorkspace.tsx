"use client";

import Modal from "@/components/Modal";
import { useCreateWorkspaceMutation } from "@/state/api";
import { useState } from "react";
import { useAuthUser } from "@/lib/useAuthUser";
import { useWorkspace } from "@/lib/useWorkspace";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const ModalNewWorkspace = ({ isOpen, onClose }: Props) => {
  const [createWorkspace, { isLoading }] = useCreateWorkspaceMutation();
  const { data: authData } = useAuthUser();
  const { setWorkspace } = useWorkspace();

  const [name, setName] = useState("");

  const handleSubmit = async () => {
    const userId = authData?.userDetails?.userId;
    if (!name || !userId) return;

    try {
      const newWorkspace = await createWorkspace({
        name,
        userId,
      }).unwrap();

      // Immediately set the new workspace as active so the app unblocks!
      setWorkspace(newWorkspace.id);

      setName("");
      onClose();
    } catch (error) {
      console.error("Failed to create workspace:", error);
    }
  };

  const inputStyles =
    "w-full rounded border border-gray-300 p-2 shadow-sm dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white dark:focus:outline-none";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      name="Welcome! Create a Workspace"
      hideClose
    >
      <div className="mb-4 text-sm text-gray-500 dark:text-neutral-400">
        To get started, you need to create a workspace for your team or personal
        projects.
      </div>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <input
          type="text"
          className={inputStyles}
          placeholder="e.g. Acme Corp, Personal, Side Project"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <button
          type="submit"
          className={`focus-offset-2 mt-4 flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600 ${
            !name || isLoading ? "cursor-not-allowed opacity-50" : ""
          }`}
          disabled={!name || isLoading}
        >
          {isLoading ? "Creating..." : "Create Workspace"}
        </button>
      </form>
    </Modal>
  );
};

export default ModalNewWorkspace;
