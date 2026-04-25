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
        href={`/dashboard/workspaces/${workspaceId}`}
        className="mb-6 inline-flex items-center gap-1.5 text-xs text-fg-muted transition-colors hover:text-fg-secondary"
      >
        <ArrowLeft size={12} />
        Back to workspace
      </Link>

      <h1 className="font-mono text-lg font-semibold text-fg-primary">
        Create Sprint
      </h1>
      <p className="mt-1 text-xs text-fg-muted">
        A sprint is a time-boxed period for completing a set of tasks.
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
            htmlFor="title"
            className="block text-xs font-medium text-fg-secondary"
          >
            Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            className="mt-1.5 block w-full rounded-md border border-border bg-bg-primary px-3 py-2 font-mono text-sm text-fg-primary placeholder-fg-muted transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/50"
            placeholder="e.g. Sprint 1, Week of Jan 6"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="startDate"
              className="block text-xs font-medium text-fg-secondary"
            >
              Start Date <span className="text-fg-muted">(optional)</span>
            </label>
            <input
              id="startDate"
              name="startDate"
              type="date"
              className="mt-1.5 block w-full rounded-md border border-border bg-bg-primary px-3 py-2 font-mono text-sm text-fg-primary transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/50"
            />
          </div>
          <div>
            <label
              htmlFor="endDate"
              className="block text-xs font-medium text-fg-secondary"
            >
              End Date <span className="text-fg-muted">(optional)</span>
            </label>
            <input
              id="endDate"
              name="endDate"
              type="date"
              className="mt-1.5 block w-full rounded-md border border-border bg-bg-primary px-3 py-2 font-mono text-sm text-fg-primary transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/50"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-bg-primary transition-all hover:bg-accent-emphasis hover:shadow-[0_0_20px_-4px] hover:shadow-accent/40 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-elevated disabled:opacity-50"
        >
          {pending ? "Creating..." : "Create Sprint"}
        </button>
      </form>
    </div>
  );
}
