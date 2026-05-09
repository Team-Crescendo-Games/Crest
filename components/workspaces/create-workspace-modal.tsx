"use client";

import { useState } from "react";
import { useActionState } from "react";
import { Plus } from "lucide-react";
import { Modal } from "@/components/common/modal";
import { createWorkspace } from "@/lib/actions/workspace";

interface Props {
  variant?: "default" | "switcher";
}

interface FormProps {
  onSuccess: () => void;
}

function CreateWorkspaceForm({ onSuccess }: FormProps) {
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
        <label htmlFor="ws-name" className="form-label">
          Name
        </label>
        <input
          id="ws-name"
          name="name"
          type="text"
          required
          className="mt-1.5 block w-full input-field"
          placeholder="e.g. Engineering"
        />
      </div>

      <div>
        <label htmlFor="ws-description" className="form-label">
          Description <span className="text-fg-muted">(optional)</span>
        </label>
        <textarea
          id="ws-description"
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

export function CreateWorkspaceModal({ variant = "default" }: Props) {
  const [open, setOpen] = useState(false);

  const trigger =
    variant === "switcher" ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-accent transition-colors hover:bg-accent/10"
      >
        <Plus size={11} />
        Create workspace
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-bg-primary transition-all hover:bg-accent-emphasis hover:shadow-[0_0_16px_-4px] hover:shadow-accent/40"
      >
        <Plus size={12} />
        Create
      </button>
    );

  return (
    <>
      {trigger}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create Workspace"
        description="A workspace is a shared space for your team to organize boards, sprints, and tasks."
      >
        <CreateWorkspaceForm onSuccess={() => setOpen(false)} />
      </Modal>
    </>
  );
}
