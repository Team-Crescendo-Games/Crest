"use client";

import { use, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import ConfirmationMenu from "@/components/ConfirmationMenu";
import DatePicker from "@/components/DatePicker";
import { localDateToUTC, utcToDateInputValue, parseLocalDate } from "@/lib/dateUtils";
import { format } from "date-fns";
import {
  useGetSprintQuery,
  useUpdateSprintMutation,
  useDeleteSprintMutation,
} from "@/state/api";
import { ArrowLeft, Calendar, Trash2 } from "lucide-react";
import Link from "next/link";

type Props = {
  params: Promise<{ id: string }>;
};

const SprintSettings = ({ params }: Props) => {
  const { id } = use(params);
  const router = useRouter();

  const { data: sprint, isLoading: isSprintLoading } = useGetSprintQuery(
    Number(id),
  );

  const [updateSprint, { isLoading: isUpdating }] = useUpdateSprintMutation();
  const [deleteSprint, { isLoading: isDeleting }] = useDeleteSprintMutation();

  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saved, setSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showDuePicker, setShowDuePicker] = useState(false);

  const startDateRef = useRef<HTMLButtonElement>(null);
  const dueDateRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (sprint) {
      setTitle(sprint.title);
      setStartDate(sprint.startDate ? utcToDateInputValue(sprint.startDate) : "");
      setDueDate(sprint.dueDate ? utcToDateInputValue(sprint.dueDate) : "");
    }
  }, [sprint]);

  const handleSave = async () => {
    if (!title.trim()) return;
    await updateSprint({
      sprintId: Number(id),
      title: title.trim(),
      startDate: startDate ? localDateToUTC(startDate) : undefined,
      dueDate: dueDate ? localDateToUTC(dueDate) : undefined,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDelete = async () => {
    await deleteSprint(Number(id));
    router.push("/");
  };

  if (isSprintLoading || !sprint) return <div className="p-8">Loading...</div>;

  const originalStartDate = sprint.startDate ? utcToDateInputValue(sprint.startDate) : "";
  const originalDueDate = sprint.dueDate ? utcToDateInputValue(sprint.dueDate) : "";
  const hasUnsavedChanges =
    title !== sprint.title ||
    startDate !== originalStartDate ||
    dueDate !== originalDueDate;

  const inputStyles =
    "w-full rounded border border-gray-300 p-2 shadow-sm dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white dark:focus:outline-none focus:outline-none focus:border-gray-400";

  const dateButtonStyles = `${inputStyles} flex items-center gap-2 text-left`;

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link
          href={`/sprints/${id}`}
          className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-neutral-400 dark:hover:text-neutral-200"
        >
          <ArrowLeft className="h-4 w-4" /> Back to sprint
        </Link>
      </div>

      <div className="max-w-lg space-y-6">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-neutral-300">
            Sprint Title
          </label>
          <input
            type="text"
            className={inputStyles}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* Start Date */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-neutral-300">
            Start Date
          </label>
          <button
            ref={startDateRef}
            type="button"
            onClick={() => { setShowStartPicker(!showStartPicker); setShowDuePicker(false); }}
            className={dateButtonStyles}
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
                if (date && dueDate && parseLocalDate(date) > parseLocalDate(dueDate)) {
                  setDueDate("");
                }
                setShowStartPicker(false);
              }}
              onClose={() => setShowStartPicker(false)}
              anchorRef={startDateRef}
            />
          )}
        </div>

        {/* Due Date */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-neutral-300">
            Due Date
          </label>
          <button
            ref={dueDateRef}
            type="button"
            onClick={() => { setShowDuePicker(!showDuePicker); setShowStartPicker(false); }}
            className={dateButtonStyles}
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
                if (date && startDate && parseLocalDate(date) < parseLocalDate(startDate)) {
                  return;
                }
                setDueDate(date || "");
                setShowDuePicker(false);
              }}
              onClose={() => setShowDuePicker(false)}
              minDate={startDate || undefined}
              anchorRef={dueDateRef}
            />
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={isUpdating || !title.trim() || !hasUnsavedChanges}
            className={`rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-200 ${
              isUpdating || !title.trim() || !hasUnsavedChanges ? "cursor-not-allowed opacity-50" : ""
            }`}
          >
            {isUpdating ? "Saving..." : "Save Changes"}
          </button>
          {hasUnsavedChanges && (
            <button
              onClick={() => {
                setTitle(sprint.title);
                setStartDate(originalStartDate);
                setDueDate(originalDueDate);
              }}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:border-stroke-dark dark:text-gray-400 dark:hover:bg-dark-tertiary"
            >
              Reset
            </button>
          )}
          {saved && (
            <span className="text-sm text-green-600 dark:text-green-400">
              Saved!
            </span>
          )}
        </div>

        <div className="border-t border-gray-200 pt-6 dark:border-stroke-dark">
          <h3 className="mb-2 text-sm font-medium text-red-600 dark:text-red-400">
            Danger Zone
          </h3>
          <p className="mb-3 text-sm text-gray-500 dark:text-neutral-400">
            Deleting this sprint will remove all task associations but will not
            delete the tasks themselves.
          </p>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isDeleting}
            className="flex items-center gap-2 rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? "Deleting..." : "Delete Sprint"}
          </button>
          <ConfirmationMenu
            isOpen={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(false)}
            onConfirm={handleDelete}
            title="Delete Sprint"
            message={`Delete "${sprint?.title}" and remove all task associations? This cannot be undone.`}
            confirmLabel="Delete"
            isLoading={isDeleting}
            variant="danger"
          />
        </div>
      </div>
    </div>
  );
};

export default SprintSettings;
