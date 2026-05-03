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
        href={`/w/${workspaceId}`}
        className="mb-6 inline-flex items-center gap-1.5 text-xs text-fg-muted transition-colors hover:text-fg-secondary"
      >
        <ArrowLeft size={12} />
        Back to workspace
      </Link>

      <h1 className="font-mono text-lg font-semibold text-fg-primary">Create Board</h1>
      <p className="mt-1 text-xs text-fg-muted">
        A board groups related tasks together. Think of it as a project or category.
      </p>

      <form action={action} className="mt-6 space-y-4">
        <input type="hidden" name="workspaceId" value={workspaceId} />

        {state?.error && <div className="alert-error">{state.error}</div>}

        <div>
          <label htmlFor="name" className="form-label">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            className="mt-1.5 block w-full input-field"
            placeholder="e.g. Frontend, Backend, Design"
          />
        </div>

        <div>
          <label htmlFor="description" className="form-label">
            Description <span className="text-fg-muted">(optional)</span>
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            className="mt-1.5 block w-full resize-none input-field"
            placeholder="What kind of tasks go on this board?"
          />
        </div>

        <button type="submit" disabled={pending} className="w-full btn-primary">
          {pending ? "Creating..." : "Create Board"}
        </button>
      </form>
    </div>
  );
}
