"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ConfirmationMenu from "@/components/ConfirmationMenu";
import {
  useGetBoardsQuery,
  useUpdateBoardMutation,
  useDeleteBoardMutation,
} from "@/state/api";
import { useWorkspace } from "@/lib/useWorkspace";
import { ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";

type Props = {
  params: Promise<{ id: string }>;
};

export default function BoardSettings({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const { activeWorkspaceId } = useWorkspace();

  const { data: boards } = useGetBoardsQuery(activeWorkspaceId || -1, {
    skip: !activeWorkspaceId,
  });
  const board = boards?.find((b) => b.id === Number(id));

  const [updateBoard, { isLoading: isUpdating }] = useUpdateBoardMutation();
  const [deleteBoard, { isLoading: isDeleting }] = useDeleteBoardMutation();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saved, setSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (board) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(board.name);
      setDescription(board.description || "");
    }
  }, [board]);

  const handleSave = async () => {
    if (!name.trim()) return;
    await updateBoard({
      boardId: Number(id),
      name: name.trim(),
      description: description.trim() || undefined,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDelete = async () => {
    await deleteBoard(Number(id));
    router.push("/");
  };

  if (!board) return <ErrorComponent />;

  const hasUnsavedChanges =
    name !== board.name ||
    description !== (board.description || "");

  const inputStyles =
    "w-full rounded border border-gray-300 p-2 shadow-sm dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white dark:focus:outline-none focus:outline-none focus:border-gray-400";

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link
          href={`/boards/${id}`}
          className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-neutral-400 dark:hover:text-neutral-200"
        >
          <ArrowLeft className="h-4 w-4" /> Back to board
        </Link>
      </div>

      <div className="max-w-lg space-y-6">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-neutral-300">
            Board Name
          </label>
          <input
            type="text"
            className={inputStyles}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-neutral-300">
            Description
          </label>
          <textarea
            className={inputStyles}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={isUpdating || !name.trim() || !hasUnsavedChanges}
            className={`rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-200 ${
              isUpdating || !name.trim() || !hasUnsavedChanges ? "cursor-not-allowed opacity-50" : ""
            }`}
          >
            {isUpdating ? "Saving..." : "Save Changes"}
          </button>
          {hasUnsavedChanges && (
            <button
              onClick={() => {
                setName(board.name);
                setDescription(board.description || "");
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
            Deleting this board will permanently remove all its tasks, comments,
            and attachments.
          </p>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isDeleting}
            className="flex items-center gap-2 rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? "Deleting..." : "Delete Board"}
          </button>
          <ConfirmationMenu
            isOpen={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(false)}
            onConfirm={handleDelete}
            title="Delete Board"
            message={`Delete "${board?.name}" and all its tasks? This cannot be undone.`}
            confirmLabel="Delete"
            isLoading={isDeleting}
            variant="danger"
          />
        </div>
      </div>
    </div>
  );
}

function ErrorComponent() {
  return (
    <div className="p-8">
      <h2 className="text-xl font-semibold text-red-600 dark:text-red-400">
        Board not found
      </h2>
      <p className="mt-2 text-gray-500 dark:text-neutral-400">
        The board you are looking for does not exist or you do not have access
        to it.
      </p>
      <Link
        href="/"
        className="mt-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-neutral-400 dark:hover:text-neutral-200"
      >
        <ArrowLeft className="h-4 w-4" /> Back to home
      </Link>
    </div>
  );
}
