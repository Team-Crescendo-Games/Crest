"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { setTaskParent } from "@/lib/actions/task";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/task-enums";
import type { TaskStatus } from "@/prisma/generated/prisma/enums";

interface ParentTask {
  id: string;
  title: string;
  boardId: string;
  status: TaskStatus;
}

export function ParentTaskSection({
  workspaceId,
  parent,
  childTaskId,
}: {
  workspaceId: string;
  parent: ParentTask;
  childTaskId: string;
}) {
  const [removed, setRemoved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleRemove() {
    setError(null);
    setRemoved(true);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("childId", childTaskId);
      formData.set("parentId", "");
      formData.set("workspaceId", workspaceId);
      const result = await setTaskParent(null, formData);
      if (result?.error) {
        setError(result.error);
        setRemoved(false);
        setTimeout(() => setError(null), 5000);
      } else {
        router.refresh();
      }
    });
  }

  if (removed) return null;

  return (
    <div className="mt-6">
      <h3 className="font-mono text-xs font-medium text-fg-secondary">Parent Task</h3>

      {error && (
        <div className="mt-2 flex items-center justify-between rounded-md border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-400">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-2 shrink-0 rounded p-0.5 transition-colors hover:bg-red-400/20"
          >
            <X size={12} />
          </button>
        </div>
      )}

      <div className="mt-2 group/parent flex items-center gap-2 rounded-md border border-border bg-bg-elevated/60 px-3 py-2 text-xs transition-colors hover:border-accent/30">
        <div
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{
            backgroundColor: STATUS_COLORS[parent.status] ?? "#9c9c98",
          }}
        />
        <Link
          href={`/w/${workspaceId}/b/${parent.boardId}/t/${parent.id}`}
          className="min-w-0 flex-1 truncate text-fg-primary transition-colors hover:text-accent"
        >
          {parent.title}
        </Link>
        <span className="shrink-0 text-[11px] text-fg-muted">{STATUS_LABELS[parent.status]}</span>
        <button
          onClick={handleRemove}
          disabled={isPending}
          className="shrink-0 rounded p-0.5 text-fg-muted opacity-0 transition-all hover:bg-bg-secondary hover:text-red-400 group-hover/parent:opacity-100 disabled:opacity-50"
          title="Remove parent"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}
