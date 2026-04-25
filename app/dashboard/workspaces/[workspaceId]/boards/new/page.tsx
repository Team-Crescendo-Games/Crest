"use client";

import { useActionState } from "react";
import { useParams } from "next/navigation";
import { createBoard } from "@/lib/actions/board";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewBoardPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [state, action, pending] = useActionState(createBoard, null);

  return (
    <div className="mx-auto max-w-lg">
      <Link
        href={`/dashboard/workspaces/${workspaceId}`}
        className="mb-6 inline-flex items-center gap-1.5 text-xs text-fg-muted transition-colors hover:text-fg-secondary"
      >
        <ArrowLeft size={12} />
        Back to workspace
      </Link>

      <h1 className="font-mono text-lg font-semibold text-fg-primary">
        Create Board
      </h1>
      <p className="mt-1 text-xs text-fg-muted">
        A board groups related tasks together. Think of it as a project or
        category.
      </p>

      <form action={action} className="mt-6 space-y-4">
        <input type="hidden" name="workspaceId" value={workspaceId} />

        {state?.error && (
          <div className="rounded-md border border-accent-emphasis/30 bg-accent-emphasis/10 px-3 py-2 text-xs text-accent-emphasis">
            {state.error}
          </div>
        )}

        <div>
          <label
            htmlFor="name"
            className="block text-xs font-medium text-fg-secondary"
          >
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            className="mt-1.5 block w-full rounded-md border border-border bg-bg-primary px-3 py-2 font-mono text-sm text-fg-primary placeholder-fg-muted transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/50"
            placeholder="e.g. Frontend, Backend, Design"
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-xs font-medium text-fg-secondary"
          >
            Description <span className="text-fg-muted">(optional)</span>
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            className="mt-1.5 block w-full resize-none rounded-md border border-border bg-bg-primary px-3 py-2 font-mono text-sm text-fg-primary placeholder-fg-muted transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/50"
            placeholder="What kind of tasks go on this board?"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-bg-primary transition-all hover:bg-accent-emphasis hover:shadow-[0_0_20px_-4px] hover:shadow-accent/40 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-elevated disabled:opacity-50"
        >
          {pending ? "Creating..." : "Create Board"}
        </button>
      </form>
    </div>
  );
}
