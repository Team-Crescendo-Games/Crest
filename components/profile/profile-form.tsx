"use client";

import { useActionState } from "react";
import { updateProfile } from "@/lib/actions/user";

export function ProfileForm({ currentName }: { currentName: string }) {
  const [state, action, pending] = useActionState(updateProfile, null);

  return (
    <form action={action} className="space-y-3">
      {state?.success && <p className="text-xs text-accent">Name updated.</p>}
      {state?.error && (
        <p className="text-xs text-accent-emphasis">{state.error}</p>
      )}

      <input
        name="name"
        defaultValue={currentName}
        required
        className="block w-full rounded-md border border-border bg-bg-primary px-3 py-2 font-mono text-sm text-fg-primary transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/50"
      />

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-accent px-4 py-2 text-xs font-medium text-bg-primary transition-all hover:bg-accent-emphasis disabled:opacity-50"
      >
        {pending ? "Saving..." : "Update Name"}
      </button>
    </form>
  );
}
