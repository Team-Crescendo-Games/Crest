"use client";

import { useActionState } from "react";
import { acceptInvitation } from "@/lib/actions/workspace";

export function AcceptInviteButton({ inviteId }: { inviteId: string }) {
  const [state, action, pending] = useActionState(acceptInvitation, null);

  return (
    <form action={action}>
      <input type="hidden" name="inviteId" value={inviteId} />
      {state?.error && <div className="mb-3 alert-error">{state.error}</div>}
      <button type="submit" disabled={pending} className="w-full btn-primary">
        {pending ? "Joining..." : "Accept & Join Workspace"}
      </button>
    </form>
  );
}
