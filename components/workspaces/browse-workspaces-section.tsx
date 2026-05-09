"use client";

import { useState } from "react";
import Link from "next/link";
import { Globe, Lock, Search, ShieldCheck } from "lucide-react";
import { Modal } from "@/components/common/modal";
import { JoinButton, ApplyButton } from "@/components/workspaces/join-buttons";

interface Workspace {
  id: string;
  name: string;
  description: string | null;
  joinPolicy: string;
  _count: { members: number };
}

interface Props {
  joinable: Workspace[];
  alreadyIn: Workspace[];
  myApplicationIds: Set<string>;
}

export function BrowseWorkspacesSection({ joinable, alreadyIn, myApplicationIds }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-fg-secondary transition-colors hover:border-accent/30 hover:text-fg-primary"
      >
        <Search size={12} />
        Browse
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Browse Workspaces"
        description="Discover workspaces you can join or apply to."
      >
        <div className="max-h-[60vh] overflow-y-auto space-y-6 pr-1">
          {/* Joinable workspaces */}
          {joinable.length > 0 && (
            <section>
              <h3 className="font-mono text-xs font-medium text-fg-primary">Available to Join</h3>
              <div className="mt-3 space-y-2">
                {joinable.map((ws) => (
                  <div key={ws.id} className="flex items-center justify-between card-panel">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10">
                        {ws.joinPolicy === "OPEN" ? (
                          <Globe size={14} className="text-accent" />
                        ) : (
                          <ShieldCheck size={14} className="text-accent-subtle" />
                        )}
                      </div>
                      <div>
                        <p className="font-mono text-sm font-medium text-fg-primary">{ws.name}</p>
                        <p className="text-[11px] text-fg-muted">
                          {ws._count.members} member
                          {ws._count.members !== 1 && "s"}
                          {ws.description && ` · ${ws.description}`}
                        </p>
                      </div>
                    </div>

                    {ws.joinPolicy === "OPEN" ? (
                      <JoinButton workspaceId={ws.id} />
                    ) : myApplicationIds.has(ws.id) ? (
                      <span className="rounded-full bg-bg-secondary px-2.5 py-1 text-[11px] font-medium text-fg-muted">
                        Applied
                      </span>
                    ) : (
                      <ApplyButton workspaceId={ws.id} />
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {joinable.length === 0 && (
            <div className="py-6 text-center">
              <Lock size={20} className="mx-auto text-fg-muted" />
              <p className="mt-3 text-xs text-fg-muted">No workspaces are currently open for joining.</p>
            </div>
          )}

          {/* Already a member */}
          {alreadyIn.length > 0 && (
            <section>
              <h3 className="font-mono text-xs font-medium text-fg-secondary">Already a Member</h3>
              <div className="mt-3 space-y-2">
                {alreadyIn.map((ws) => (
                  <Link
                    key={ws.id}
                    href={`/w/${ws.id}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 card-panel transition-colors hover:border-accent/30"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10">
                      <Globe size={14} className="text-accent" />
                    </div>
                    <div>
                      <p className="font-mono text-sm font-medium text-fg-primary">{ws.name}</p>
                      <p className="text-[11px] text-fg-muted">
                        {ws._count.members} member
                        {ws._count.members !== 1 && "s"}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </Modal>
    </>
  );
}
