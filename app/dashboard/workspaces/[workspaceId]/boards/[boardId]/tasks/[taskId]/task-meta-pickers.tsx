"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, Check, X, Plus, Search, Calendar } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import {
  moveTaskToBoard,
  updateTaskSprints,
  updateTaskStatus,
  updateTaskPriority,
  updateTaskDueDate,
  updateTaskAssignees,
  updateTaskTags,
} from "@/lib/actions/task";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  TASK_STATUSES,
  TASK_PRIORITIES,
} from "@/lib/task-enums";
import type { TaskStatus, TaskPriority } from "@/prisma/generated/prisma/enums";

/* ── Status Picker ─────────────────────────────────────────────────────── */

export function StatusPicker({
  taskId,
  workspaceId,
  currentStatus,
}: {
  taskId: string;
  workspaceId: string;
  currentStatus: TaskStatus;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSelect(newStatus: TaskStatus) {
    if (newStatus === status) {
      setOpen(false);
      return;
    }
    setStatus(newStatus);
    setOpen(false);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("taskId", taskId);
      formData.set("status", newStatus);
      formData.set("workspaceId", workspaceId);
      await updateTaskStatus(null, formData);
    });
  }

  const color = STATUS_COLORS[status];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={isPending}
        className="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors disabled:opacity-50"
        style={{
          backgroundColor: color + "20",
          color: color,
        }}
      >
        <div
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        {isPending ? "Saving…" : STATUS_LABELS[status]}
        <ChevronDown size={9} className={open ? "rotate-180" : ""} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 w-40 rounded-md border border-border bg-bg-elevated shadow-lg">
            {TASK_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => handleSelect(s)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-bg-secondary"
              >
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: STATUS_COLORS[s] }}
                />
                <span
                  className={s === status ? "font-medium" : ""}
                  style={{ color: STATUS_COLORS[s] }}
                >
                  {STATUS_LABELS[s]}
                </span>
                {s === status && (
                  <Check size={11} className="ml-auto text-accent" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Priority Picker ───────────────────────────────────────────────────── */

export function PriorityPicker({
  taskId,
  workspaceId,
  currentPriority,
}: {
  taskId: string;
  workspaceId: string;
  currentPriority: TaskPriority;
}) {
  const [priority, setPriority] = useState(currentPriority);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSelect(newPriority: TaskPriority) {
    if (newPriority === priority) {
      setOpen(false);
      return;
    }
    setPriority(newPriority);
    setOpen(false);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("taskId", taskId);
      formData.set("priority", newPriority);
      formData.set("workspaceId", workspaceId);
      await updateTaskPriority(null, formData);
    });
  }

  const color = PRIORITY_COLORS[priority];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={isPending}
        className="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors disabled:opacity-50"
        style={{
          backgroundColor: color + "20",
          color: color,
        }}
      >
        <div
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        {isPending ? "Saving…" : PRIORITY_LABELS[priority]}
        <ChevronDown size={9} className={open ? "rotate-180" : ""} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 w-36 rounded-md border border-border bg-bg-elevated shadow-lg">
            {TASK_PRIORITIES.map((p) => (
              <button
                key={p}
                onClick={() => handleSelect(p)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-bg-secondary"
              >
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: PRIORITY_COLORS[p] }}
                />
                <span
                  className={p === priority ? "font-medium" : ""}
                  style={{ color: PRIORITY_COLORS[p] }}
                >
                  {PRIORITY_LABELS[p]}
                </span>
                {p === priority && (
                  <Check size={11} className="ml-auto text-accent" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Board Picker ──────────────────────────────────────────────────────── */

export function BoardPicker({
  taskId,
  workspaceId,
  currentBoardId,
  currentBoardName,
  boards,
}: {
  taskId: string;
  workspaceId: string;
  currentBoardId: string;
  currentBoardName: string;
  boards: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSelect(boardId: string) {
    if (boardId === currentBoardId) {
      setOpen(false);
      return;
    }
    setOpen(false);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("taskId", taskId);
      formData.set("boardId", boardId);
      formData.set("workspaceId", workspaceId);
      const result = await moveTaskToBoard(null, formData);
      if (result?.success && result.newBoardId) {
        // Navigate to the task on its new board
        router.push(
          `/dashboard/workspaces/${workspaceId}/boards/${result.newBoardId}/tasks/${taskId}`,
        );
      }
    });
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={isPending}
        className="flex items-center gap-1 text-[11px] text-accent transition-colors hover:text-accent-emphasis disabled:opacity-50"
      >
        {isPending ? "Moving…" : currentBoardName}
        <ChevronDown size={10} className={open ? "rotate-180" : ""} />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 max-h-48 w-48 overflow-y-auto rounded-md border border-border bg-bg-elevated shadow-lg">
            {boards.map((board) => (
              <button
                key={board.id}
                onClick={() => handleSelect(board.id)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-fg-primary transition-colors hover:bg-bg-secondary"
              >
                {board.id === currentBoardId && (
                  <Check size={11} className="shrink-0 text-accent" />
                )}
                <span
                  className={
                    board.id === currentBoardId
                      ? "font-medium text-accent"
                      : "pl-[19px]"
                  }
                >
                  {board.name}
                </span>
              </button>
            ))}
            {boards.length === 0 && (
              <p className="px-3 py-2 text-[11px] text-fg-muted">
                No other boards
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Sprint Picker ─────────────────────────────────────────────────────── */

export function SprintPicker({
  taskId,
  workspaceId,
  currentSprintIds,
  sprints,
}: {
  taskId: string;
  workspaceId: string;
  currentSprintIds: string[];
  sprints: { id: string; title: string }[];
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>(currentSprintIds);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isDirty =
    JSON.stringify([...selectedIds].sort()) !==
    JSON.stringify([...currentSprintIds].sort());

  function toggle(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function save() {
    setOpen(false);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("taskId", taskId);
      formData.set("workspaceId", workspaceId);
      for (const id of selectedIds) {
        formData.append("sprintIds", id);
      }
      await updateTaskSprints(null, formData);
    });
  }

  function cancel() {
    setSelectedIds(currentSprintIds);
    setOpen(false);
  }

  const selectedSprints = sprints.filter((s) => selectedIds.includes(s.id));

  return (
    <div className="relative">
      {/* Display current sprints */}
      {selectedSprints.length > 0 ? (
        <div className="space-y-1">
          {selectedSprints.map((s) => (
            <Link
              key={s.id}
              href={`/dashboard/workspaces/${workspaceId}/sprints/${s.id}`}
              className="block text-[11px] text-accent transition-colors hover:text-accent-emphasis"
            >
              {s.title}
            </Link>
          ))}
        </div>
      ) : (
        <span className="text-[11px] text-fg-muted">None</span>
      )}

      {/* Edit button */}
      <button
        onClick={() => setOpen(!open)}
        disabled={isPending}
        className="mt-1 flex items-center gap-1 text-[10px] text-fg-muted transition-colors hover:text-fg-secondary disabled:opacity-50"
      >
        {isPending ? (
          "Saving…"
        ) : (
          <>
            <Plus size={10} />
            {selectedSprints.length > 0 ? "Edit sprints" : "Add to sprint"}
          </>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={cancel} />
          <div className="absolute left-0 top-full z-20 mt-1 w-52 rounded-md border border-border bg-bg-elevated shadow-lg">
            <div className="max-h-48 overflow-y-auto p-1">
              {sprints.length === 0 && (
                <p className="px-3 py-2 text-[11px] text-fg-muted">
                  No sprints in this workspace
                </p>
              )}
              {sprints.map((sprint) => {
                const isSelected = selectedIds.includes(sprint.id);
                return (
                  <button
                    key={sprint.id}
                    onClick={() => toggle(sprint.id)}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-bg-secondary"
                  >
                    <div
                      className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${
                        isSelected
                          ? "border-accent bg-accent"
                          : "border-border"
                      }`}
                    >
                      {isSelected && (
                        <Check size={9} className="text-bg-primary" />
                      )}
                    </div>
                    <span
                      className={
                        isSelected
                          ? "font-medium text-fg-primary"
                          : "text-fg-secondary"
                      }
                    >
                      {sprint.title}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Save / Cancel */}
            <div className="flex items-center justify-end gap-1.5 border-t border-border px-2 py-1.5">
              <button
                onClick={cancel}
                className="rounded px-2 py-1 text-[11px] text-fg-muted transition-colors hover:bg-bg-secondary hover:text-fg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={!isDirty}
                className="rounded bg-accent px-2 py-1 text-[11px] font-medium text-bg-primary transition-colors hover:bg-accent-emphasis disabled:opacity-40"
              >
                Save
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Due Date Picker ───────────────────────────────────────────────────── */

export function DueDatePicker({
  taskId,
  workspaceId,
  currentDueDate,
}: {
  taskId: string;
  workspaceId: string;
  currentDueDate: string | null;
}) {
  const [dueDate, setDueDate] = useState(currentDueDate ?? "");
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string) {
    setDueDate(value);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("taskId", taskId);
      formData.set("workspaceId", workspaceId);
      formData.set("dueDate", value);
      await updateTaskDueDate(null, formData);
    });
  }

  function handleClear() {
    setDueDate("");
    startTransition(async () => {
      const formData = new FormData();
      formData.set("taskId", taskId);
      formData.set("workspaceId", workspaceId);
      formData.set("dueDate", "");
      await updateTaskDueDate(null, formData);
    });
  }

  return (
    <div className={isPending ? "opacity-50" : ""}>
      <div className="flex items-center gap-1.5">
        <Calendar size={10} className="shrink-0 text-fg-muted" />
        <input
          type="date"
          value={dueDate}
          onChange={(e) => handleChange(e.target.value)}
          disabled={isPending}
          className="w-full rounded border border-border bg-bg-primary px-1.5 py-1 font-mono text-[11px] text-fg-primary focus:border-accent focus:outline-none disabled:opacity-50"
        />
        {dueDate && (
          <button
            onClick={handleClear}
            disabled={isPending}
            className="shrink-0 rounded p-0.5 text-fg-muted hover:text-red-400 disabled:opacity-50"
            title="Clear due date"
          >
            <X size={10} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Assignee Picker (sidebar) ─────────────────────────────────────────── */

export function AssigneePicker({
  taskId,
  workspaceId,
  currentAssigneeIds,
  members,
}: {
  taskId: string;
  workspaceId: string;
  currentAssigneeIds: string[];
  members: { id: string; name: string | null; email?: string | null; image?: string | null }[];
}) {
  const [assigneeIds, setAssigneeIds] = useState<string[]>(currentAssigneeIds);
  const [showDropdown, setShowDropdown] = useState(false);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  function save(newIds: string[]) {
    setAssigneeIds(newIds);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("taskId", taskId);
      formData.set("workspaceId", workspaceId);
      for (const id of newIds) {
        formData.append("assigneeIds", id);
      }
      await updateTaskAssignees(null, formData);
    });
  }

  function add(id: string) {
    save([...assigneeIds, id]);
    setSearch("");
  }

  function remove(id: string) {
    save(assigneeIds.filter((a) => a !== id));
  }

  const assigned = members.filter((m) => assigneeIds.includes(m.id));
  const available = members.filter(
    (m) =>
      !assigneeIds.includes(m.id) &&
      (m.name?.toLowerCase().includes(search.toLowerCase()) ||
        m.email?.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className={isPending ? "opacity-60" : ""}>
      {/* Currently assigned */}
      {assigned.length > 0 ? (
        <div className="space-y-1">
          {assigned.map((m) => (
            <div
              key={m.id}
              className="group/assignee flex items-center gap-1.5 text-[11px] text-fg-primary"
            >
              <UserAvatar name={m.name} image={m.image} size={18} />
              <span className="min-w-0 flex-1 truncate">{m.name ?? m.email}</span>
              <button
                onClick={() => remove(m.id)}
                disabled={isPending}
                className="shrink-0 rounded p-0.5 text-fg-muted opacity-0 transition-all hover:text-red-400 group-hover/assignee:opacity-100 disabled:opacity-50"
                title="Remove assignee"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <span className="text-[11px] text-fg-muted">Unassigned</span>
      )}

      {/* Add button / search */}
      {!showDropdown ? (
        <button
          onClick={() => setShowDropdown(true)}
          disabled={isPending}
          className="mt-1 flex items-center gap-1 text-[10px] text-fg-muted transition-colors hover:text-fg-secondary disabled:opacity-50"
        >
          <Plus size={10} />
          Add assignee
        </button>
      ) : (
        <div className="relative mt-1.5">
          <div className="flex items-center gap-1.5 rounded-md border border-border bg-bg-primary px-2 py-1">
            <Search size={11} className="shrink-0 text-fg-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="min-w-0 flex-1 bg-transparent text-xs text-fg-primary placeholder-fg-muted outline-none"
              autoFocus
            />
            <button
              onClick={() => {
                setShowDropdown(false);
                setSearch("");
              }}
              className="shrink-0 text-fg-muted hover:text-fg-secondary"
            >
              <X size={11} />
            </button>
          </div>

          {available.length > 0 && (
            <div className="absolute left-0 top-full z-20 mt-1 max-h-40 w-full overflow-y-auto rounded-md border border-border bg-bg-elevated shadow-lg">
              {available.map((m) => (
                <button
                  key={m.id}
                  onClick={() => add(m.id)}
                  disabled={isPending}
                  className="flex w-full items-center gap-2 px-2 py-1.5 text-xs text-fg-primary hover:bg-bg-secondary disabled:opacity-50"
                >
                  <UserAvatar name={m.name} image={m.image} size={16} />
                  <span className="truncate">{m.name ?? m.email}</span>
                </button>
              ))}
            </div>
          )}

          {available.length === 0 && search && (
            <div className="absolute left-0 top-full z-20 mt-1 w-full rounded-md border border-border bg-bg-elevated px-2 py-2 text-[11px] text-fg-muted shadow-lg">
              No matching members
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Tag Picker (sidebar) ──────────────────────────────────────────────── */

export function TagPicker({
  taskId,
  workspaceId,
  currentTagIds,
  tags,
}: {
  taskId: string;
  workspaceId: string;
  currentTagIds: string[];
  tags: { id: string; name: string; color: string | null }[];
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>(currentTagIds);
  const [isPending, startTransition] = useTransition();

  function toggle(id: string) {
    const newIds = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];
    setSelectedIds(newIds);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("taskId", taskId);
      formData.set("workspaceId", workspaceId);
      for (const tagId of newIds) {
        formData.append("tagIds", tagId);
      }
      await updateTaskTags(null, formData);
    });
  }

  return (
    <div className={isPending ? "opacity-60" : ""}>
      <div className="flex flex-wrap gap-1">
        {tags.map((tag) => {
          const color = tag.color ?? "#6B7280";
          const isSelected = selectedIds.includes(tag.id);
          return (
            <button
              key={tag.id}
              onClick={() => toggle(tag.id)}
              disabled={isPending}
              className="rounded-full border px-1.5 py-0.5 text-[10px] font-medium transition-all disabled:opacity-50"
              style={{
                borderColor: color + (isSelected ? "80" : "30"),
                color: isSelected ? "#fff" : color,
                backgroundColor: isSelected ? color : "transparent",
              }}
            >
              {tag.name}
            </button>
          );
        })}
        {tags.length === 0 && (
          <span className="text-[11px] text-fg-muted">No tags</span>
        )}
      </div>
    </div>
  );
}
