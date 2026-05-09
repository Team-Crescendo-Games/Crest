"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteTask } from "@/lib/actions/task";

export function DeleteTaskButton({
  taskId,
  workspaceId,
  boardId,
}: {
  taskId: string;
  workspaceId: string;
  boardId: string;
}) {
  const router = useRouter();
  const [, action, pending] = useActionState(async (prev: unknown, formData: FormData) => {
    const result = await deleteTask(prev, formData);
    if (result?.success) {
      router.push(`/w/${workspaceId}/b/${boardId}`);
    }
    return result;
  }, null);

  return (
    <form action={action}>
      <input type="hidden" name="taskId" value={taskId} />
      <button
        type="submit"
        disabled={pending}
        onClick={(e) => {
          if (!confirm("Delete this task? This cannot be undone.")) {
            e.preventDefault();
          }
        }}
        aria-label="Delete task"
        title={pending ? "Deleting..." : "Delete task"}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-red-500/40 bg-red-500/5 text-red-500 transition-colors hover:border-red-500 hover:bg-red-500 hover:text-white disabled:opacity-50"
      >
        <Trash2 size={14} />
      </button>
    </form>
  );
}
