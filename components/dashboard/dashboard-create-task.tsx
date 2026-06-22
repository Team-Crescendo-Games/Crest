"use client";

import { useActionState, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createTask } from "@/lib/actions/task";
import { getWorkspaceFormData } from "@/lib/actions/workspace";
import { TaskFormModal } from "@/components/tasks/create-task-form";

interface WorkspaceOption {
  id: string;
  name: string;
  boards: { id: string; name: string }[];
}

interface MemberOption {
  id: string;
  name: string | null;
  email?: string | null;
  image?: string | null;
}

interface TagOption {
  id: string;
  name: string;
  color: string | null;
}

interface SprintOption {
  id: string;
  title: string;
}

interface WorkspaceFormData {
  boards: { id: string; name: string }[];
  members: MemberOption[];
  tags: TagOption[];
  sprints: SprintOption[];
}

export function DashboardCreateTask({
  workspaces,
  defaultStatus = "NOT_STARTED",
  currentUserId,
  compact = false,
}: {
  workspaces: WorkspaceOption[];
  defaultStatus?: string;
  currentUserId?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (workspaces.length === 0) return null;

  // Check if any workspace has boards
  const hasAnyBoards = workspaces.some((w) => w.boards.length > 0);
  if (!hasAnyBoards) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex cursor-pointer items-center gap-1 rounded-md border border-border bg-bg-secondary text-fg-secondary transition-colors hover:border-accent/40 hover:text-accent ${
          compact ? "px-2 py-1 text-[11px]" : "px-3 py-2 text-xs"
        }`}
      >
        <Plus size={compact ? 10 : 12} />
        {compact ? "Add" : "Add Task"}
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={() => setOpen(false)}
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
    >
      <DashboardCreateTaskModal
        workspaces={workspaces}
        defaultStatus={defaultStatus}
        currentUserId={currentUserId}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}

/**
 * Dashboard-specific wrapper around the shared TaskFormModal. The dashboard spans
 * every workspace, so this component owns the two things the board form doesn't:
 * a workspace selector, and lazy-loading that workspace's members/tags/sprints/boards.
 * All actual form fields are delegated to the shared modal so the two stay in sync.
 */
function DashboardCreateTaskModal({
  workspaces,
  defaultStatus,
  currentUserId,
  onClose,
}: {
  workspaces: WorkspaceOption[];
  defaultStatus: string;
  currentUserId?: string;
  onClose: () => void;
}) {
  const router = useRouter();

  // Default to first workspace that has boards
  const defaultWs = workspaces.find((w) => w.boards.length > 0) ?? workspaces[0];
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(defaultWs.id);
  const [formData, setFormData] = useState<WorkspaceFormData | null>(null);
  const [loadingFormData, setLoadingFormData] = useState(true);

  // Load workspace-specific data (boards, members, tags, sprints) when workspace changes.
  // `loadingFormData` is flipped on in the workspace <select>'s onChange (and initialized
  // true), so the effect only needs to resolve and clear it.
  useEffect(() => {
    let cancelled = false;

    getWorkspaceFormData(selectedWorkspaceId)
      .then((data) => {
        if (!cancelled) {
          setFormData(data);
          setLoadingFormData(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFormData(null);
          setLoadingFormData(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedWorkspaceId]);

  const [state, action, pending] = useActionState(async (prev: unknown, fd: FormData) => {
    const result = await createTask(prev, fd);
    if (result?.success) {
      onClose();
      router.refresh();
    }
    return result;
  }, null);

  // In the dashboard ("My Tasks") view, default to assigning the task to the current
  // user so it shows up in their board after creation — but only once we've confirmed
  // they're a member of the selected workspace.
  const isMember = !!currentUserId && !!formData?.members.some((m) => m.id === currentUserId);
  const defaultAssigneeIds = isMember && currentUserId ? [currentUserId] : [];

  const workspacePicker = (
    <div>
      <label className="block text-[11px] font-medium text-fg-muted">Workspace</label>
      <select
        value={selectedWorkspaceId}
        onChange={(e) => {
          setSelectedWorkspaceId(e.target.value);
          setLoadingFormData(true);
        }}
        className="mt-1 block w-full rounded border border-border bg-bg-primary px-2 py-1.5 font-mono text-xs text-fg-primary focus:border-accent focus:outline-none"
      >
        {workspaces.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <TaskFormModal
      workspaceId={selectedWorkspaceId}
      boards={formData?.boards ?? []}
      defaults={{ status: defaultStatus, assigneeIds: defaultAssigneeIds }}
      sprints={formData?.sprints}
      members={formData?.members}
      tags={formData?.tags}
      state={state}
      action={action}
      pending={pending}
      onClose={onClose}
      mode="create"
      headerSlot={workspacePicker}
      loadingExtras={loadingFormData}
      // Re-sync selections (incl. the default self-assignee) when the workspace
      // changes or its data finishes loading.
      resetKey={`${selectedWorkspaceId}:${loadingFormData ? "loading" : "loaded"}`}
    />
  );
}
