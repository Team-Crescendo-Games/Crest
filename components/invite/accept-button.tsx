"use client";

import { useActionState } from "react";
import { acceptInvitation } from "@/lib/actions/workspace";

export function AcceptInviteButton({ inviteId }: { inviteId: string }) {
  const [state, action, pending] = useActionState(acceptInvitation, null);

  return (
    <form action={action}>
      <input type="hidden" name="inviteId" value={inviteId} />
      {state?.error && (
        <div className="mb-3 rounded-md border border-accent-emphasis/30 bg-accent-emphasis/10 px-3 py-2 text-xs text-accent-emphasis">
          {state.error}
        </div>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-bg-primary transition-all hover:bg-accent-emphasis disabled:opacity-50"
      >
        {pending ? "Joining..." : "Accept & Join Workspace"}
      </button>
    </form>
  );
}
