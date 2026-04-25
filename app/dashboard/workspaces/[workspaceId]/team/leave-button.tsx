"use client";

import { useActionState } from "react";
import { leaveWorkspace } from "@/lib/actions/workspace";
import { LogOut } from "lucide-react";

interface LeaveWarning {
  isLastMember: boolean;
  willDelete: boolean;
  immediate?: boolean;
  name: string;
}

export function LeaveWorkspaceButton({
  workspaceId,
  leaveWarning,
}: {
  workspaceId: string;
  leaveWarning: LeaveWarning | null;
}) {
  const [state, action, pending] = useActionState(leaveWorkspace, null);

  if (!leaveWarning) return null;

  function handleClick(e: React.MouseEvent) {
    let message = `Leave "${leaveWarning!.name}"?`;

    if (leaveWarning!.isLastMember) {
      if (leaveWarning!.immediate) {
        message +=
          "\n\nYou are the last member. Because this workspace is not open, it and ALL its data (boards, tasks, sprints, etc.) will be PERMANENTLY DELETED immediately.\n\nMake sure to save any crucial data before leaving.";
      } else {
        message +=
          "\n\nYou are the last member. Because this workspace is open, it will be deleted after 7 days if no one joins.\n\nMake sure to save any crucial data before leaving.";
      }
    }

    if (!confirm(message)) {
      e.preventDefault();
    }
  }

  return (
    <form action={action}>
      <input type="hidden" name="workspaceId" value={workspaceId} />

      {state?.error && (
        <p className="mb-2 text-xs text-accent-emphasis">{state.error}</p>
      )}

      {leaveWarning.isLastMember && (
        <div className="mb-3 rounded-md border border-accent-emphasis/30 bg-accent-emphasis/10 px-3 py-2 text-xs text-accent-emphasis">
          You are the last member of this workspace.
          {leaveWarning.immediate
            ? " Leaving will permanently delete the workspace and all its data."
            : " If no one joins within 7 days, the workspace will be deleted."}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        onClick={handleClick}
        className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-fg-muted transition-colors hover:bg-accent-emphasis/10 hover:text-accent-emphasis disabled:opacity-50"
      >
        <LogOut size={13} />
        {pending ? "Leaving..." : "Leave Workspace"}
      </button>
    </form>
  );
}
