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

      {state?.error && <div className="alert-error">{state.error}</div>}

      {state?.success && <div className="alert-success">Settings saved.</div>}

      <div>
        <label htmlFor="name" className="form-label">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={workspace.name}
          className="mt-1.5 block w-full input-field"
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
          defaultValue={workspace.description ?? ""}
          className="mt-1.5 block w-full resize-none input-field"
        />
      </div>

      <div>
        <label htmlFor="joinPolicy" className="form-label">
          Join Policy
        </label>
        <select
          id="joinPolicy"
          name="joinPolicy"
          defaultValue={workspace.joinPolicy}
          className="mt-1.5 block w-full input-field"
        >
          <option value="INVITE_ONLY">Invite Only — hidden from browser</option>
          <option value="APPLY_TO_JOIN">Apply to Join — visible, requires approval</option>
          <option value="OPEN">Open — anyone can join</option>
        </select>
        <p className="mt-1 text-[10px] text-fg-muted">Controls how others can discover and join this workspace.</p>
      </div>

      <button type="submit" disabled={pending} className="w-full btn-primary">
        {pending ? "Saving..." : "Save Settings"}
      </button>
    </form>
  );
}
