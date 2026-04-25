"use client";

import { useActionState } from "react";
import { updateWorkspace } from "@/lib/actions/workspace";

interface Props {
  workspace: {
    id: string;
    name: string;
    description: string | null;
    joinPolicy: string;
  };
}

export function WorkspaceSettingsForm({ workspace }: Props) {
  const [state, action, pending] = useActionState(updateWorkspace, null);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="workspaceId" value={workspace.id} />

      {state?.error && (
        <div className="rounded-md border border-accent-emphasis/30 bg-accent-emphasis/10 px-3 py-2 text-xs text-accent-emphasis">
          {state.error}
        </div>
      )}

      {state?.success && (
        <div className="rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-xs text-accent">
          Settings saved.
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
          defaultValue={workspace.name}
          className="mt-1.5 block w-full rounded-md border border-border bg-bg-primary px-3 py-2 font-mono text-sm text-fg-primary placeholder-fg-muted transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/50"
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
          defaultValue={workspace.description ?? ""}
          className="mt-1.5 block w-full resize-none rounded-md border border-border bg-bg-primary px-3 py-2 font-mono text-sm text-fg-primary placeholder-fg-muted transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/50"
        />
      </div>

      <div>
        <label
          htmlFor="joinPolicy"
          className="block text-xs font-medium text-fg-secondary"
        >
          Join Policy
        </label>
        <select
          id="joinPolicy"
          name="joinPolicy"
          defaultValue={workspace.joinPolicy}
          className="mt-1.5 block w-full rounded-md border border-border bg-bg-primary px-3 py-2 font-mono text-sm text-fg-primary transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/50"
        >
          <option value="INVITE_ONLY">Invite Only — hidden from browser</option>
          <option value="APPLY_TO_JOIN">
            Apply to Join — visible, requires approval
          </option>
          <option value="OPEN">Open — anyone can join</option>
        </select>
        <p className="mt-1 text-[10px] text-fg-muted">
          Controls how others can discover and join this workspace.
        </p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-bg-primary transition-all hover:bg-accent-emphasis disabled:opacity-50"
      >
        {pending ? "Saving..." : "Save Settings"}
      </button>
    </form>
  );
}
