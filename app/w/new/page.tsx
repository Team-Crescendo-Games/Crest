"use client";

import { useActionState } from "react";
import { createWorkspace } from "@/lib/actions/workspace";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewWorkspacePage() {
  const [state, action, pending] = useActionState(createWorkspace, null);

  return (
    <div className="mx-auto max-w-lg">
      <Link
        href="/w"
        className="mb-6 inline-flex items-center gap-1.5 text-xs text-fg-muted transition-colors hover:text-fg-secondary"
      >
        <ArrowLeft size={12} />
        Back to workspaces
      </Link>

      <h1 className="font-mono text-lg font-semibold text-fg-primary">Create Workspace</h1>
      <p className="mt-1 text-xs text-fg-muted">
        A workspace is a shared space for your team to organize boards, sprints, and tasks.
      </p>

      <form action={action} className="mt-6 space-y-4">
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
            placeholder="e.g. Engineering"
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
            placeholder="What is this workspace for?"
          />
        </div>

        <button type="submit" disabled={pending} className="w-full btn-primary">
          {pending ? "Creating..." : "Create Workspace"}
        </button>
      </form>
    </div>
  );
}
