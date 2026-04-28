"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, Copy, Check, X, Workflow } from "lucide-react";
import { createTask } from "@/lib/actions/task";
import { UserAvatar } from "@/components/user-avatar";

export function FlowModeButton({
  active,
  onToggle,
}: {
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={active ? "Close Flow mode" : "Open Flow mode"}
      title={active ? "Close Flow mode" : "Open Flow mode"}
      className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
        active
          ? "border-accent bg-accent/10 text-accent"
          : "border-border bg-bg-elevated/60 text-fg-secondary hover:border-accent/40 hover:text-accent"
      }`}
    >
      <Workflow size={14} />
    </button>
  );
}

export interface SourceTask {
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string; // YYYY-MM-DD or ""
  points: number | null;
  assigneeIds: string[];
}

export interface WorkspaceMember {
  id: string;
  name: string | null;
  email: string | null;
}

export function TaskActions({
  taskId,
  workspaceId,
  boardId,
  source,
  members,
}: {
  taskId: string;
  workspaceId: string;
  boardId: string;
  source: SourceTask;
  members: WorkspaceMember[];
}) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [duplicateOpen, setDuplicateOpen] = useState(false);

  async function handleCopyLink() {
    const url =
      typeof window !== "undefined"
        ? window.location.href
        : `/w/${workspaceId}/b/${boardId}/t/${taskId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setCopyError(null);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopyError("Couldn't copy — copy from the address bar instead.");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleCopyLink}
        aria-label={copied ? "Link copied" : "Copy link"}
        title={copyError ?? (copied ? "Link copied" : "Copy link")}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-bg-elevated/60 text-fg-secondary transition-colors hover:border-accent/40 hover:text-accent"
      >
        {copied ? (
          <Check size={14} className="text-accent" />
        ) : (
          <Link2 size={14} />
        )}
      </button>

      <button
        type="button"
        onClick={() => setDuplicateOpen(true)}
        aria-label="Duplicate task"
        title="Duplicate task"
        className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-bg-elevated/60 text-fg-secondary transition-colors hover:border-accent/40 hover:text-accent"
      >
        <Copy size={14} />
      </button>

      {duplicateOpen && (
        <DuplicateTaskModal
          workspaceId={workspaceId}
          boardId={boardId}
          source={source}
          members={members}
          onClose={() => setDuplicateOpen(false)}
        />
      )}
    </>
  );
}

function DuplicateTaskModal({
  workspaceId,
  boardId,
  source,
  members,
  onClose,
}: {
  workspaceId: string;
  boardId: string;
  source: SourceTask;
  members: WorkspaceMember[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [assigneeIds, setAssigneeIds] = useState<string[]>(source.assigneeIds);

  const [state, action, pending] = useActionState(
    async (prev: unknown, formData: FormData) => {
      const result = await createTask(prev, formData);
      if (result?.success && result.newTaskId) {
        router.push(`/w/${workspaceId}/b/${boardId}/t/${result.newTaskId}`);
      }
      return result;
    },
    null,
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        action={action}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg space-y-3 rounded-md border border-border bg-bg-elevated p-4 shadow-lg"
      >
        <input type="hidden" name="boardId" value={boardId} />
        <input type="hidden" name="workspaceId" value={workspaceId} />
        {assigneeIds.map((id) => (
          <input key={id} type="hidden" name="assigneeIds" value={id} />
        ))}

        <div className="flex items-center justify-between">
          <h3 className="font-mono text-xs font-medium text-fg-primary">
            Duplicate Task
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-fg-muted hover:text-fg-secondary"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        {state?.error && (
          <div className="rounded border border-accent-emphasis/30 bg-accent-emphasis/10 px-2 py-1 text-[11px] text-accent-emphasis">
            {state.error}
          </div>
        )}

        <div>
          <label className="block text-[11px] font-medium text-fg-muted">
            Title
          </label>
          <input
            name="title"
            required
            defaultValue={`${source.title} Copy`}
            autoFocus
            className="mt-1 block w-full rounded border border-border bg-bg-primary px-2 py-1.5 font-mono text-xs text-fg-primary placeholder-fg-muted focus:border-accent focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-fg-muted">
            Description
          </label>
          <textarea
            name="description"
            rows={3}
            defaultValue={source.description ?? ""}
            className="mt-1 block w-full resize-none rounded border border-border bg-bg-primary px-2 py-1.5 font-mono text-xs text-fg-primary placeholder-fg-muted focus:border-accent focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-medium text-fg-muted">
              Status
            </label>
            <select
              name="status"
              defaultValue={source.status}
              className="mt-1 block w-full rounded border border-border bg-bg-primary px-2 py-1.5 font-mono text-xs text-fg-primary focus:border-accent focus:outline-none"
            >
              <option value="NOT_STARTED">Not Started</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="IN_REVIEW">In Review</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-fg-muted">
              Priority
            </label>
            <select
              name="priority"
              defaultValue={source.priority}
              className="mt-1 block w-full rounded border border-border bg-bg-primary px-2 py-1.5 font-mono text-xs text-fg-primary focus:border-accent focus:outline-none"
            >
              <option value="NONE">None</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-fg-muted">
            Due Date
          </label>
          <input
            name="dueDate"
            type="date"
            required
            defaultValue={source.dueDate}
            className="mt-1 block w-full rounded border border-border bg-bg-primary px-2 py-1.5 font-mono text-xs text-fg-primary focus:border-accent focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-fg-muted">
            Points
          </label>
          <input
            name="points"
            type="number"
            min={0}
            defaultValue={source.points ?? ""}
            placeholder="—"
            className="mt-1 block w-24 rounded border border-border bg-bg-primary px-2 py-1.5 font-mono text-xs text-fg-primary focus:border-accent focus:outline-none"
          />
        </div>

        <div>
          <p className="block text-[11px] font-medium text-fg-muted">
            Assignees
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {members.map((m) => {
              const selected = assigneeIds.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() =>
                    setAssigneeIds((prev) =>
                      prev.includes(m.id)
                        ? prev.filter((x) => x !== m.id)
                        : [...prev, m.id],
                    )
                  }
                  className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-colors ${
                    selected
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border bg-bg-secondary text-fg-secondary hover:border-accent/40"
                  }`}
                >
                  <UserAvatar name={m.name} image={null} size={14} />
                  {m.name ?? m.email}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-3 py-1.5 text-xs text-fg-muted hover:text-fg-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-bg-primary hover:bg-accent-emphasis disabled:opacity-50"
          >
            {pending ? "Creating..." : "Create Duplicate"}
          </button>
        </div>
      </form>
    </div>
  );
}
