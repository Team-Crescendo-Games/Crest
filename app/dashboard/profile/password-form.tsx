"use client";

import { useActionState, useRef } from "react";
import { changePassword } from "@/lib/actions/user";

export function PasswordForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(
    async (prev: unknown, formData: FormData) => {
      const result = await changePassword(prev, formData);
      if (result?.success) formRef.current?.reset();
      return result;
    },
    null,
  );

  return (
    <form ref={formRef} action={action} className="space-y-3">
      {state?.success && <p className="text-xs text-accent">{state.message}</p>}
      {state?.error && (
        <p className="text-xs text-accent-emphasis">{state.error}</p>
      )}

      <div>
        <label className="block text-[11px] font-medium text-fg-muted">
          Current Password
        </label>
        <input
          name="currentPassword"
          type="password"
          required
          className="mt-1 block w-full rounded-md border border-border bg-bg-primary px-3 py-2 font-mono text-sm text-fg-primary transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/50"
        />
      </div>

      <div>
        <label className="block text-[11px] font-medium text-fg-muted">
          New Password
        </label>
        <input
          name="newPassword"
          type="password"
          required
          minLength={8}
          placeholder="At least 8 characters"
          className="mt-1 block w-full rounded-md border border-border bg-bg-primary px-3 py-2 font-mono text-sm text-fg-primary placeholder-fg-muted transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/50"
        />
      </div>

      <div>
        <label className="block text-[11px] font-medium text-fg-muted">
          Confirm New Password
        </label>
        <input
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          className="mt-1 block w-full rounded-md border border-border bg-bg-primary px-3 py-2 font-mono text-sm text-fg-primary transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/50"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-accent px-4 py-2 text-xs font-medium text-bg-primary transition-all hover:bg-accent-emphasis disabled:opacity-50"
      >
        {pending ? "Changing..." : "Change Password"}
      </button>
    </form>
  );
}
