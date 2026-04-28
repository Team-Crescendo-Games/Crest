"use client";

import { useState, useTransition } from "react";
import { ArrowRightLeft } from "lucide-react";
import { transferOwnership } from "@/lib/actions/workspace";
import { UserAvatar } from "@/components/user-avatar";

interface Member {
  id: string;
  name: string | null;
  email: string | null;
  image?: string | null;
}

export function TransferOwnership({
  workspaceId,
  members,
}: {
  workspaceId: string;
  members: Member[];
}) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setOpen(false);
    setSelectedId(null);
    setConfirming(false);
    setError(null);
  }

  function handleTransfer() {
    if (!selectedId) return;
    setError(null);

    const formData = new FormData();
    formData.set("workspaceId", workspaceId);
    formData.set("newOwnerId", selectedId);

    startTransition(async () => {
      const result = await transferOwnership(null, formData);
      if (result?.error) {
        setError(result.error);
        setConfirming(false);
      } else {
        reset();
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs text-fg-muted transition-colors hover:border-accent/40 hover:text-accent"
      >
        <ArrowRightLeft size={12} />
        Transfer Ownership
      </button>
    );
  }

  if (confirming && selectedId) {
    const selected = members.find((m) => m.id === selectedId);
    return (
      <div className="rounded-md border border-accent/30 bg-bg-elevated/60 p-4 backdrop-blur-sm">
        <p className="text-xs font-medium text-fg-primary">
          Transfer ownership to{" "}
          <span className="text-accent">{selected?.name ?? selected?.email}</span>?
        </p>
        <p className="mt-1 text-[11px] text-fg-muted">
          You will lose owner privileges and become a regular member. This
          action can only be reversed by the new owner.
        </p>
        {error && (
          <p className="mt-2 text-[11px] text-accent-emphasis">{error}</p>
        )}
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={handleTransfer}
            disabled={pending}
            className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-bg-primary hover:bg-accent-emphasis disabled:opacity-50"
          >
            {pending ? "Transferring..." : "Confirm Transfer"}
          </button>
          <button
            onClick={reset}
            disabled={pending}
            className="rounded px-3 py-1.5 text-xs text-fg-muted hover:text-fg-secondary"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border bg-bg-elevated/60 p-4 backdrop-blur-sm">
      <p className="text-xs font-medium text-fg-primary">
        Select the new owner
      </p>
      <div className="mt-3 space-y-1.5">
        {members.map((member) => (
          <button
            key={member.id}
            onClick={() => {
              setSelectedId(member.id);
              setConfirming(true);
            }}
            className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-bg-secondary/60 ${
              selectedId === member.id
                ? "bg-accent/10 ring-1 ring-accent/30"
                : ""
            }`}
          >
            <UserAvatar name={member.name} image={member.image} size={28} />
            <div>
              <p className="text-xs font-medium text-fg-primary">
                {member.name}
              </p>
              <p className="text-[11px] text-fg-muted">{member.email}</p>
            </div>
          </button>
        ))}
      </div>
      <div className="mt-3">
        <button
          onClick={reset}
          className="rounded px-3 py-1.5 text-xs text-fg-muted hover:text-fg-secondary"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
