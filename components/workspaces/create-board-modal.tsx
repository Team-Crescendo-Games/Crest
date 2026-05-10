"use client";

import { useState } from "react";
import { useActionState } from "react";
import { Plus } from "lucide-react";
import { Modal } from "@/components/common/modal";
import { createBoard } from "@/lib/actions/board";

interface Props {
  workspaceId: string;
}

interface FormProps {
  workspaceId: string;
  onSuccess: () => void;
}

function CreateBoardForm({ workspaceId, onSuccess }: FormProps) {
  const [state, dispatch, pending] = useActionState(
    async (_prev: Awaited<ReturnType<typeof createBoard>> | null, formData: FormData) => {
      const result = await createBoard(_prev, formData);
      if (!result?.error) onSuccess();
      return result;
    },
    null,
  );

  return (
    <form action={dispatch} className="space-y-4">
      <input type="hidden" name="workspaceId" value={workspaceId} />

      {state?.error && <div className="alert-error">{state.error}</div>}

      <div>
        <label htmlFor="board-name" className="form-label">
          Name
        </label>
        <input
          id="board-name"
          name="name"
          type="text"
          required
          className="mt-1.5 block w-full input-field"
          placeholder="e.g. Frontend, Backend, Design"
        />
      </div>

      <div>
        <label htmlFor="board-description" className="form-label">
          Description <span className="text-fg-muted">(optional)</span>
        </label>
        <textarea
          id="board-description"
          name="description"
          rows={3}
          className="mt-1.5 block w-full resize-none input-field"
          placeholder="What kind of tasks go on this board?"
        />
      </div>

      <button type="submit" disabled={pending} className="w-full btn-primary">
        {pending ? "Creating..." : "Create Board"}
      </button>
    </form>
  );
}

export function CreateBoardModal({ workspaceId }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="cursor-pointer flex items-center gap-1 rounded-md bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent transition-colors hover:bg-accent/20"
      >
        <Plus size={11} />
        New Board
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create Board"
        description="A board groups related tasks together. Think of it as a project or category."
      >
        <CreateBoardForm workspaceId={workspaceId} onSuccess={() => setOpen(false)} />
      </Modal>
    </>
  );
}
