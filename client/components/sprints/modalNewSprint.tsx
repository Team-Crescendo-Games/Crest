"use client";

import Modal from "@/components/Modal";
import { useCreateSprintMutation } from "@/state/api";
import { useState } from "react";
import { useWorkspace } from "@/lib/useWorkspace"; 

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const ModalNewSprint = ({ isOpen, onClose }: Props) => {
  const { activeWorkspaceId } = useWorkspace(); 
  const [createSprint, { isLoading }] = useCreateSprintMutation();

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(getTodayDate());
  const [dueDate, setDueDate] = useState("");
  const [titleError, setTitleError] = useState("");
  const [dateError, setDateError] = useState("");

  const handleSubmit = async () => {
    // Failsafe in case Redux state drops the ID
    if (!activeWorkspaceId) {
      console.error("No active workspace selected");
      return;
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setTitleError("Title is required");
      return;
    }

    if (!startDate || !dueDate) {
      setDateError("Both start date and due date are required");
      return;
    }

    if (new Date(dueDate) < new Date(startDate)) {
      setDateError("Due date must be after start date");
      return;
    }

    setTitleError("");
    setDateError("");

    try {
      await createSprint({
        title: trimmedTitle,
        startDate,
        dueDate,
        workspaceId: activeWorkspaceId, 
      });
      setTitle("");
      setStartDate(getTodayDate());
      setDueDate("");
      onClose();
    } catch (error) {
      console.error("Failed to create sprint:", error);
    }
  };

  const handleClose = () => {
    setTitle("");
    setStartDate(getTodayDate());
    setDueDate("");
    setTitleError("");
    setDateError("");
    onClose();
  };

  const inputStyles =
    "w-full rounded border border-gray-300 p-2 shadow-sm dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white dark:focus:outline-none";

  const isFormValid =
    title.trim().length > 0 && startDate && dueDate && activeWorkspaceId;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} name="Create New Sprint">
      {/* Form JSX remains exactly the same */}
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <div>
          <input
            type="text"
            className={`${inputStyles} ${titleError ? "border-red-500 dark:border-red-500" : ""}`}
            placeholder="Sprint Title *"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (titleError) setTitleError("");
            }}
          />
          {titleError && (
            <p className="mt-1 text-sm text-red-500">{titleError}</p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Start Date *
          </label>
          <input
            type="date"
            className={`${inputStyles} ${dateError ? "border-red-500 dark:border-red-500" : ""}`}
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              if (dateError) setDateError("");
            }}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Due Date *
          </label>
          <input
            type="date"
            className={`${inputStyles} ${dateError ? "border-red-500 dark:border-red-500" : ""}`}
            value={dueDate}
            onChange={(e) => {
              setDueDate(e.target.value);
              if (dateError) setDateError("");
            }}
            required
          />
          {dateError && (
            <p className="mt-1 text-sm text-red-500">{dateError}</p>
          )}
        </div>
        <button
          type="submit"
          className={`focus-offset-2 mt-4 flex w-full justify-center rounded-md border border-transparent bg-gray-800 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-600 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-200 ${
            !isFormValid || isLoading ? "cursor-not-allowed opacity-50" : ""
          }`}
          disabled={!isFormValid || isLoading}
        >
          {isLoading ? "Creating..." : "Create Sprint"}
        </button>
      </form>
    </Modal>
  );
};

export default ModalNewSprint;
