"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { Modal } from "@/components/common/modal";
import { useActionState } from "react";
import { createWorkspace } from "@/lib/actions/workspace";

interface Workspace {
  id: string;
  name: string;
}

interface WorkspaceSwitcherProps {
  workspaces: Workspace[];
  activeWorkspaceId: string | undefined;
  activeWorkspaceName: string | undefined;
}

function CreateWorkspaceForm({ onSuccess }: { onSuccess: () => void }) {
  const [state, dispatch, pending] = useActionState(
    async (_prev: Awaited<ReturnType<typeof createWorkspace>> | null, formData: FormData) => {
      const result = await createWorkspace(_prev, formData);
      if (!result?.error) onSuccess();
      return result;
    },
    null,
  );

  return (
    <form action={dispatch} className="space-y-4">
      {state?.error && <div className="alert-error">{state.error}</div>}

      <div>
        <label htmlFor="sw-ws-name" className="form-label">
          Name
        </label>
        <input
          id="sw-ws-name"
          name="name"
          type="text"
          required
          className="mt-1.5 block w-full input-field"
          placeholder="e.g. Engineering"
        />
      </div>

      <div>
        <label htmlFor="sw-ws-description" className="form-label">
          Description <span className="text-fg-muted">(optional)</span>
        </label>
        <textarea
          id="sw-ws-description"
          name="description"
          rows={3}
          className="mt-1.5 block w-full resize-none input-field"
          placeholder="What is this workspace for?"
        />
      </div>

      <button type="submit" disabled={pending} className="w-full btn-primary">
        {pending ? "Creating..." : "Create Workspace"}
      </button>
    </form>
  );
}

export function WorkspaceSwitcher({ workspaces, activeWorkspaceId, activeWorkspaceName }: WorkspaceSwitcherProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="relative mb-2">
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex w-full items-center justify-between rounded-md border border-border-subtle px-2.5 py-1.5 text-xs font-medium text-fg-primary transition-colors hover:border-accent/30 hover:text-accent"
      >
        <span className="truncate">{activeWorkspaceName ?? "No workspace"}</span>
        <ChevronDown size={12} className={`transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
      </button>

      {dropdownOpen && (
        <div className="absolute left-0 top-full z-20 mt-1 w-full rounded-md border border-border bg-bg-elevated p-1 shadow-lg shadow-accent/5">
          {workspaces.map((ws) => (
            <Link
              key={ws.id}
              href={`/w/${ws.id}`}
              onClick={() => setDropdownOpen(false)}
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
              onClick={() => setDropdownOpen(false)}
              className="block rounded-md px-2.5 py-1.5 text-xs text-fg-muted transition-colors hover:bg-bg-secondary hover:text-fg-primary"
            >
              All workspaces →
            </Link>
            <button
              type="button"
              onClick={() => {
                setDropdownOpen(false);
                setModalOpen(true);
              }}
              className="flex w-full items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-accent transition-colors hover:bg-accent/10"
            >
              <Plus size={11} />
              Create workspace
            </button>
          </div>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create Workspace"
        description="A workspace is a shared space for your team to organize boards, sprints, and tasks."
      >
        <CreateWorkspaceForm onSuccess={() => setModalOpen(false)} />
      </Modal>
    </div>
  );
}
