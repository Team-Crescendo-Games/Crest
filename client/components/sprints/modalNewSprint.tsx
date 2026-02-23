"use client";

import Modal from "@/components/Modal";
import DatePicker from "@/components/DatePicker";
import { useCreateSprintMutation } from "@/state/api";
import { localDateToUTC, parseLocalDate } from "@/lib/dateUtils";
import { format } from "date-fns";
import { useState, useRef } from "react";
import { useWorkspace } from "@/lib/useWorkspace";
import { Calendar } from "lucide-react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const ModalNewSprint = ({ isOpen, onClose }: Props) => {
  const { activeWorkspaceId } = useWorkspace();
  const [createSprint, { isLoading }] = useCreateSprintMutation();

  const getTodayDate = () => new Date().toISOString().split("T")[0]!;

  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(getTodayDate());
  const [dueDate, setDueDate] = useState("");
  const [titleError, setTitleError] = useState("");
  const [dateError, setDateError] = useState("");
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showDuePicker, setShowDuePicker] = useState(false);

  const startDateRef = useRef<HTMLButtonElement>(null);
  const dueDateRef = useRef<HTMLButtonElement>(null);

  const handleSubmit = async () => {
    if (!activeWorkspaceId) return;

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
        startDate: localDateToUTC(startDate),
        dueDate: localDateToUTC(dueDate),
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
    setShowStartPicker(false);
    setShowDuePicker(false);
    onClose();
  };

  const inputStyles =
    "w-full rounded border border-gray-300 p-2 shadow-sm dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white dark:focus:outline-none";

  const isFormValid =
    title.trim().length > 0 && startDate && dueDate && activeWorkspaceId;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} name="Create New Sprint">
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

        {/* Start Date */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Start Date *
          </label>
          <button
            ref={startDateRef}
            type="button"
            onClick={() => {
              setShowStartPicker(!showStartPicker);
              setShowDuePicker(false);
            }}
            className={`${inputStyles} flex items-center gap-2 text-left ${dateError ? "border-red-500 dark:border-red-500" : ""}`}
          >
            <Calendar className="h-4 w-4 text-gray-400" />
            {startDate
              ? format(parseLocalDate(startDate), "MMM d, yyyy")
              : "Select start date"}
          </button>
          {showStartPicker && (
            <DatePicker
              value={startDate || undefined}
              onChange={(date) => {
                setStartDate(date || "");
                if (
                  date &&
                  dueDate &&
                  parseLocalDate(date) > parseLocalDate(dueDate)
                ) {
                  setDueDate("");
                }
                if (dateError) setDateError("");
                setShowStartPicker(false);
              }}
              onClose={() => setShowStartPicker(false)}
              anchorRef={startDateRef}
            />
          )}
        </div>

        {/* Due Date */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Due Date *
          </label>
          <button
            ref={dueDateRef}
            type="button"
            onClick={() => {
              setShowDuePicker(!showDuePicker);
              setShowStartPicker(false);
            }}
            className={`${inputStyles} flex items-center gap-2 text-left ${dateError ? "border-red-500 dark:border-red-500" : ""}`}
          >
            <Calendar className="h-4 w-4 text-gray-400" />
            {dueDate
              ? format(parseLocalDate(dueDate), "MMM d, yyyy")
              : "Select due date"}
          </button>
          {showDuePicker && (
            <DatePicker
              value={dueDate || undefined}
              onChange={(date) => {
                if (
                  date &&
                  startDate &&
                  parseLocalDate(date) < parseLocalDate(startDate)
                ) {
                  return;
                }
                setDueDate(date || "");
                if (dateError) setDateError("");
                setShowDuePicker(false);
              }}
              onClose={() => setShowDuePicker(false)}
              minDate={startDate || undefined}
              anchorRef={dueDateRef}
            />
          )}
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
