"use client";

import { useActionState, useState } from "react";
import { createInvitation } from "@/lib/actions/workspace";
import { Plus, Copy, Check, Clock } from "lucide-react";

interface Invitation {
  id: string;
  createdByName: string;
  createdAt: Date;
  expiresAt: Date;
  isExpired: boolean;
}

export function InviteSection({
  workspaceId,
  invitations,
}: {
  workspaceId: string;
  invitations: Invitation[];
}) {
  const [state, action, pending] = useActionState(createInvitation, null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function copyLink(inviteId: string) {
    const url = `${window.location.origin}/invite/${inviteId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(inviteId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="space-y-3">
      {/* Create invitation */}
      <form action={action} className="flex items-center gap-2">
        <input type="hidden" name="workspaceId" value={workspaceId} />
        <select
          name="expiresInDays"
          className="rounded-md border border-border bg-bg-primary px-2.5 py-1.5 font-mono text-[11px] text-fg-primary transition-colors focus:border-accent focus:outline-none"
        >
          <option value="1">1 day</option>
          <option value="7">7 days</option>
          <option value="30">30 days</option>
        </select>
        <button
          type="submit"
          disabled={pending}
          className="flex items-center gap-1.5 rounded-md bg-accent/10 px-2.5 py-1.5 text-[11px] font-medium text-accent transition-colors hover:bg-accent/20 disabled:opacity-50"
        >
          <Plus size={11} />
          {pending ? "Creating..." : "Create Invite Link"}
        </button>
        {state?.error && (
          <span className="text-[11px] text-accent-emphasis">
            {state.error}
          </span>
        )}
      </form>

      {/* Newly created link */}
      {state?.success && state.inviteId && (
        <div className="flex items-center gap-2 rounded-md border border-accent/30 bg-accent/5 px-3 py-2">
          <code className="flex-1 truncate font-mono text-[11px] text-accent">
            {typeof window !== "undefined"
              ? `${window.location.origin}/invite/${state.inviteId}`
              : `/invite/${state.inviteId}`}
          </code>
          <button
            onClick={() => copyLink(state.inviteId!)}
            className="shrink-0 text-accent hover:text-accent-emphasis"
          >
            {copiedId === state.inviteId ? (
              <Check size={12} />
            ) : (
              <Copy size={12} />
            )}
          </button>
        </div>
      )}

      {/* Existing invitations */}
      {invitations.length > 0 && (
        <div className="space-y-1.5">
          {invitations.map((inv) => (
            <div
              key={inv.id}
              className={`flex items-center justify-between rounded-md border px-3 py-2 ${
                inv.isExpired
                  ? "border-border bg-bg-secondary/50"
                  : "border-border bg-bg-elevated/60"
              }`}
            >
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyLink(inv.id)}
                  className="text-fg-muted hover:text-fg-secondary"
                  title="Copy invite link"
                >
                  {copiedId === inv.id ? (
                    <Check size={11} />
                  ) : (
                    <Copy size={11} />
                  )}
                </button>
                <code className="font-mono text-[11px] text-fg-muted">
                  {inv.id.slice(0, 12)}...
                </code>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-fg-muted">
                <span>by {inv.createdByName}</span>
                <span className="flex items-center gap-1">
                  <Clock size={9} />
                  {inv.isExpired ? (
                    <span className="text-accent-emphasis">Expired</span>
                  ) : (
                    `Expires ${new Date(inv.expiresAt).toLocaleDateString()}`
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
