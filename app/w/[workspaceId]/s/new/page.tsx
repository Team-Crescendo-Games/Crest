"use client";

import { useActionState } from "react";
import { useParams } from "next/navigation";
import { createSprint } from "@/lib/actions/sprint";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewSprintPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [state, action, pending] = useActionState(createSprint, null);

  return (
    <div className="mx-auto max-w-lg">
      <Link
        href={`/w/${workspaceId}`}
        className="mb-6 inline-flex items-center gap-1.5 text-xs text-fg-muted transition-colors hover:text-fg-secondary"
      >
        <ArrowLeft size={12} />
        Back to workspace
      </Link>

      <h1 className="font-mono text-lg font-semibold text-fg-primary">Create Sprint</h1>
      <p className="mt-1 text-xs text-fg-muted">A sprint is a time-boxed period for completing a set of tasks.</p>

      <form action={action} className="mt-6 space-y-4">
        <input type="hidden" name="workspaceId" value={workspaceId} />

        {state?.error && <div className="alert-error">{state.error}</div>}

        <div>
          <label htmlFor="title" className="form-label">
            Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            className="mt-1.5 block w-full input-field"
            placeholder="e.g. Sprint 1, Week of Jan 6"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="startDate" className="form-label">
              Start Date <span className="text-fg-muted">(optional)</span>
            </label>
            <input id="startDate" name="startDate" type="date" className="mt-1.5 block w-full input-field" />
          </div>
          <div>
            <label htmlFor="endDate" className="form-label">
              End Date <span className="text-fg-muted">(optional)</span>
            </label>
            <input id="endDate" name="endDate" type="date" className="mt-1.5 block w-full input-field" />
          </div>
        </div>

        <button type="submit" disabled={pending} className="w-full btn-primary">
          {pending ? "Creating..." : "Create Sprint"}
        </button>
      </form>
    </div>
  );
}
