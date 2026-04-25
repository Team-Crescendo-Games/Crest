"use client";

import { useActionState } from "react";
import { updateEmail } from "@/lib/actions/user";

export function EmailForm({ currentEmail }: { currentEmail: string }) {
  const [state, action, pending] = useActionState(updateEmail, null);

  return (
    <form action={action} className="space-y-3">
      {state?.success && <p className="text-xs text-accent">{state.message}</p>}
      {state?.error && (
        <p className="text-xs text-accent-emphasis">{state.error}</p>
      )}

      <div>
        <label className="block text-[11px] font-medium text-fg-muted">
          New Email
        </label>
        <input
          name="email"
          type="email"
          defaultValue={currentEmail}
          required
          className="mt-1 block w-full rounded-md border border-border bg-bg-primary px-3 py-2 font-mono text-sm text-fg-primary transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/50"
        />
      </div>

      <div>
        <label className="block text-[11px] font-medium text-fg-muted">
          Current Password
        </label>
        <input
          name="password"
          type="password"
          required
          placeholder="Verify your identity"
          className="mt-1 block w-full rounded-md border border-border bg-bg-primary px-3 py-2 font-mono text-sm text-fg-primary placeholder-fg-muted transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/50"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-accent px-4 py-2 text-xs font-medium text-bg-primary transition-all hover:bg-accent-emphasis disabled:opacity-50"
      >
        {pending ? "Updating..." : "Update Email"}
      </button>
    </form>
  );
}
