"use client";

import { useActionState } from "react";
import { joinWorkspace, applyToWorkspace } from "@/lib/actions/workspace";

export function JoinButton({ workspaceId }: { workspaceId: string }) {
  const [state, action, pending] = useActionState(joinWorkspace, null);

  return (
    <form action={action}>
      <input type="hidden" name="workspaceId" value={workspaceId} />
      {state?.error && (
        <p className="mb-1 text-[10px] text-accent-emphasis">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-accent px-3 py-1.5 text-[11px] font-medium text-bg-primary transition-all hover:bg-accent-emphasis disabled:opacity-50"
      >
        {pending ? "Joining..." : "Join"}
      </button>
    </form>
  );
}

export function ApplyButton({ workspaceId }: { workspaceId: string }) {
  const [state, action, pending] = useActionState(applyToWorkspace, null);

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      {state?.error && (
        <p className="text-[10px] text-accent-emphasis">{state.error}</p>
      )}
      {state?.success ? (
        <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[10px] font-medium text-accent">
          Applied
        </span>
      ) : (
        <button
          type="submit"
          disabled={pending}
          className="rounded-md border border-accent/30 px-3 py-1.5 text-[11px] font-medium text-accent transition-all hover:bg-accent/10 disabled:opacity-50"
        >
          {pending ? "Applying..." : "Apply"}
        </button>
      )}
    </form>
  );
}
