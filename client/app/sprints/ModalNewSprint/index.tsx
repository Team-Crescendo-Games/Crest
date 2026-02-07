"use client";

import Modal from "@/components/Modal";
import { useCreateSprintMutation } from "@/state/api";
import { useState } from "react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const ModalNewSprint = ({ isOpen, onClose }: Props) => {
  const [createSprint, { isLoading }] = useCreateSprintMutation();
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [titleError, setTitleError] = useState("");

  const handleSubmit = async () => {
    // Validate title is not empty
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setTitleError("Title is required");
      return;
    }

    setTitleError("");

    try {
      await createSprint({
        title: trimmedTitle,
        startDate: startDate || undefined,
        dueDate: dueDate || undefined,
      });
      // Reset form and close modal on success
      setTitle("");
      setStartDate("");
      setDueDate("");
      onClose();
    } catch (error) {
      // Error handling is managed by RTK Query
      console.error("Failed to create sprint:", error);
    }
  };

  const handleClose = () => {
    // Reset form state when closing
    setTitle("");
    setStartDate("");
    setDueDate("");
    setTitleError("");
    onClose();
  };

  const inputStyles =
    "w-full rounded border border-gray-300 p-2 shadow-sm dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white dark:focus:outline-none";

  const isFormValid = title.trim().length > 0;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} name="Create New Sprint">
      <form
        className="mt-4 space-y-6"
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
            Start Date (optional)
          </label>
          <input
            type="date"
            className={inputStyles}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Due Date (optional)
          </label>
          <input
            type="date"
            className={inputStyles}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
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
