"use client";

import { useState } from "react";
import { useActionState } from "react";
import { Plus } from "lucide-react";
import { Modal } from "@/components/common/modal";
import { createSprint } from "@/lib/actions/sprint";

interface Props {
  workspaceId: string;
}

interface FormProps {
  workspaceId: string;
  onSuccess: () => void;
}

function CreateSprintForm({ workspaceId, onSuccess }: FormProps) {
  const [state, dispatch, pending] = useActionState(
    async (_prev: Awaited<ReturnType<typeof createSprint>> | null, formData: FormData) => {
      const result = await createSprint(_prev, formData);
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
        <label htmlFor="sprint-title" className="form-label">
          Title
        </label>
        <input
          id="sprint-title"
          name="title"
          type="text"
          required
          className="mt-1.5 block w-full input-field"
          placeholder="e.g. Sprint 1, Week of Jan 6"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="sprint-startDate" className="form-label">
            Start Date <span className="text-fg-muted">(optional)</span>
          </label>
          <input id="sprint-startDate" name="startDate" type="date" className="mt-1.5 block w-full input-field" />
        </div>
        <div>
          <label htmlFor="sprint-endDate" className="form-label">
            End Date <span className="text-fg-muted">(optional)</span>
          </label>
          <input id="sprint-endDate" name="endDate" type="date" className="mt-1.5 block w-full input-field" />
        </div>
      </div>

      <button type="submit" disabled={pending} className="w-full btn-primary">
        {pending ? "Creating..." : "Create Sprint"}
      </button>
    </form>
  );
}

export function CreateSprintModal({ workspaceId }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 rounded-md bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent transition-colors hover:bg-accent/20"
      >
        <Plus size={11} />
        New Sprint
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create Sprint"
        description="A sprint is a time-boxed period for completing a set of tasks."
      >
        <CreateSprintForm workspaceId={workspaceId} onSuccess={() => setOpen(false)} />
      </Modal>
    </>
  );
}
