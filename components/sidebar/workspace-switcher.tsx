"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, Plus } from "lucide-react";

interface Workspace {
  id: string;
  name: string;
}

interface WorkspaceSwitcherProps {
  workspaces: Workspace[];
  activeWorkspaceId: string | undefined;
  activeWorkspaceName: string | undefined;
}

export function WorkspaceSwitcher({
  workspaces,
  activeWorkspaceId,
  activeWorkspaceName,
}: WorkspaceSwitcherProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative mb-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-md border border-border-subtle px-2.5 py-1.5 text-xs font-medium text-fg-primary transition-colors hover:border-accent/30 hover:text-accent"
      >
        <span className="truncate">
          {activeWorkspaceName ?? "No workspace"}
        </span>
        <ChevronDown
          size={12}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-full rounded-md border border-border bg-bg-elevated p-1 shadow-lg shadow-accent/5">
          {workspaces.map((ws) => (
            <Link
              key={ws.id}
              href={`/w/${ws.id}`}
              onClick={() => setOpen(false)}
              className={`block rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                ws.id === activeWorkspaceId
                  ? "bg-accent/10 text-accent"
                  : "text-fg-secondary hover:bg-bg-secondary hover:text-fg-primary"
              }`}
            >
              {ws.name}
            </Link>
          ))}
          <div className="mt-1 border-t border-border pt-1">
            <Link
              href="/w"
              onClick={() => setOpen(false)}
              className="block rounded-md px-2.5 py-1.5 text-xs text-fg-muted transition-colors hover:bg-bg-secondary hover:text-fg-primary"
            >
              All workspaces →
            </Link>
            <Link
              href="/w/new"
              onClick={() => setOpen(false)}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-accent transition-colors hover:bg-accent/10"
            >
              <Plus size={11} />
              Create workspace
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
