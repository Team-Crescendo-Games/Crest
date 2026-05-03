"use client";

import { useActionState, useRef } from "react";
import { updateProfile } from "@/lib/actions/user";
import { updateEmail } from "@/lib/actions/user";
import { changePassword } from "@/lib/actions/user";

export function ProfileForm({ currentName }: { currentName: string }) {
  const [state, action, pending] = useActionState(updateProfile, null);

  return (
    <form action={action} className="space-y-3">
      {state?.success && <p className="text-xs text-accent">Name updated.</p>}
      {state?.error && <p className="text-xs text-accent-emphasis">{state.error}</p>}

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

export function EmailForm({ currentEmail }: { currentEmail: string }) {
  const [state, action, pending] = useActionState(updateEmail, null);

  return (
    <form action={action} className="space-y-3">
      {state?.success && <p className="text-xs text-accent">{state.message}</p>}
      {state?.error && <p className="text-xs text-accent-emphasis">{state.error}</p>}

      <div>
        <label className="block text-[11px] font-medium text-fg-muted">New Email</label>
        <input
          name="email"
          type="email"
          defaultValue={currentEmail}
          required
          className="mt-1 block w-full rounded-md border border-border bg-bg-primary px-3 py-2 font-mono text-sm text-fg-primary transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/50"
        />
      </div>

      <div>
        <label className="block text-[11px] font-medium text-fg-muted">Current Password</label>
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

export function PasswordForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(async (prev: unknown, formData: FormData) => {
    const result = await changePassword(prev, formData);
    if (result?.success) formRef.current?.reset();
    return result;
  }, null);

  return (
    <form ref={formRef} action={action} className="space-y-3">
      {state?.success && <p className="text-xs text-accent">{state.message}</p>}
      {state?.error && <p className="text-xs text-accent-emphasis">{state.error}</p>}

      <div>
        <label className="block text-[11px] font-medium text-fg-muted">Current Password</label>
        <input
          name="currentPassword"
          type="password"
          required
          className="mt-1 block w-full rounded-md border border-border bg-bg-primary px-3 py-2 font-mono text-sm text-fg-primary transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/50"
        />
      </div>

      <div>
        <label className="block text-[11px] font-medium text-fg-muted">New Password</label>
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
        <label className="block text-[11px] font-medium text-fg-muted">Confirm New Password</label>
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
