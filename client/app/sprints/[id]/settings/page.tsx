"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import ConfirmationMenu from "@/components/ConfirmationMenu";
import { localDateToUTC, utcToDateInputValue } from "@/lib/dateUtils";
import {
  useGetSprintQuery,
  useUpdateSprintMutation,
  useDeleteSprintMutation,
} from "@/state/api";
import { ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";

type Props = {
  params: Promise<{ id: string }>;
};

const SprintSettings = ({ params }: Props) => {
  const { id } = use(params);
  const router = useRouter();

  // Swapped to query just the specific sprint
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

  useEffect(() => {
    if (sprint) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTitle(sprint.title);
      setStartDate(
        sprint.startDate
          ? utcToDateInputValue(sprint.startDate)
          : "",
      );
      setDueDate(
        sprint.dueDate
          ? utcToDateInputValue(sprint.dueDate)
          : "",
      );
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

  const inputStyles =
    "w-full rounded border border-gray-300 p-2 shadow-sm dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white dark:focus:outline-none focus:outline-none focus:border-gray-400";

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link
          href={`/sprints/${id}`}
          className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-neutral-400 dark:hover:text-neutral-200"
        >
          <ArrowLeft className="h-4 w-4" /> Back to sprint
        </Link>
        <Header name={`${sprint.title} — Settings`} />
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

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-neutral-300">
            Start Date
          </label>
          <input
            type="date"
            className={inputStyles}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-neutral-300">
            Due Date
          </label>
          <input
            type="date"
            className={inputStyles}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={isUpdating || !title.trim()}
            className={`rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-200 ${
              isUpdating || !title.trim() ? "cursor-not-allowed opacity-50" : ""
            }`}
          >
            {isUpdating ? "Saving..." : "Save Changes"}
          </button>
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
