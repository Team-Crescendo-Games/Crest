"use client";

import { useActionState, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Search, ChevronDown, Check } from "lucide-react";
import { createTask } from "@/lib/actions/task";
import { UserAvatar } from "@/components/common/user-avatar";
import { TASK_PRIORITIES, PRIORITY_LABELS, PRIORITY_COLORS } from "@/lib/task-enums";
import type { TaskPriority } from "@/prisma/generated/prisma/enums";

interface BoardOption {
  id: string;
  name: string;
}

interface SprintOption {
  id: string;
  title: string;
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

/**
 * Unified task creation form used across board, sprint, and member views.
 */
export function CreateTaskForm({
  workspaceId,
  boardId,
  boards,
  defaultStatus = "NOT_STARTED",
  assigneeId,
  sprintId,
  sprints,
  members,
  tags,
  compact = false,
}: {
  workspaceId: string;
  boardId?: string;
  boards?: BoardOption[];
  defaultStatus?: string;
  assigneeId?: string;
  sprintId?: string;
  sprints?: SprintOption[];
  members?: MemberOption[];
  tags?: TagOption[];
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const [state, action, pending] = useActionState(async (prev: unknown, formData: FormData) => {
    const result = await createTask(prev, formData);
    if (result?.success) {
      setOpen(false);
      router.refresh();
    }
    return result;
  }, null);

  const hasBoards = boardId || (boards && boards.length > 0);
  if (!hasBoards) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex items-center gap-1 rounded-md border border-border bg-bg-secondary text-fg-secondary transition-colors hover:border-accent/40 hover:text-accent cursor-pointer ${
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
      <CreateTaskModal
        workspaceId={workspaceId}
        boardId={boardId}
        boards={boards}
        defaultStatus={defaultStatus}
        assigneeId={assigneeId}
        sprintId={sprintId}
        sprints={sprints}
        members={members}
        tags={tags}
        state={state}
        action={action}
        pending={pending}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}

function CreateTaskModal({
  workspaceId,
  boardId,
  boards,
  defaultStatus,
  assigneeId,
  sprintId,
  sprints,
  members,
  tags,
  state,
  action,
  pending,
  onClose,
}: {
  workspaceId: string;
  boardId?: string;
  boards?: BoardOption[];
  defaultStatus: string;
  assigneeId?: string;
  sprintId?: string;
  sprints?: SprintOption[];
  members?: MemberOption[];
  tags?: TagOption[];
  state: { error?: string; success?: boolean } | null;
  action: (payload: FormData) => void;
  pending: boolean;
  onClose: () => void;
}) {
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>(assigneeId ? [assigneeId] : []);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedSprint, setSelectedSprint] = useState(sprintId ?? "");
  const [priority, setPriority] = useState<TaskPriority>("NONE");

  const showBoardPicker = !boardId && boards && boards.length > 0;

  return (
    <form
      action={action}
      onClick={(e) => e.stopPropagation()}
      className="w-full max-w-md max-h-[90vh] overflow-y-auto space-y-3 rounded-md border border-border bg-bg-elevated p-4 shadow-lg"
    >
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="status" value={defaultStatus} />
      <input type="hidden" name="priority" value={priority} />
      {boardId && <input type="hidden" name="boardId" value={boardId} />}
      {selectedAssignees.map((id) => (
        <input key={id} type="hidden" name="assigneeIds" value={id} />
      ))}
      {selectedTags.map((id) => (
        <input key={id} type="hidden" name="tagIds" value={id} />
      ))}
      {selectedSprint && <input type="hidden" name="sprintId" value={selectedSprint} />}

      <div className="flex items-center justify-between">
        <h3 className="font-mono text-xs font-medium text-fg-primary">New Task</h3>
        <button type="button" onClick={onClose} className="text-fg-muted hover:text-fg-secondary" aria-label="Close">
          <X size={14} />
        </button>
      </div>

      {state?.error && (
        <div className="rounded border border-accent-emphasis/30 bg-accent-emphasis/10 px-2 py-1 text-[11px] text-accent-emphasis">
          {state.error}
        </div>
      )}

      {/* Board picker */}
      {showBoardPicker && (
        <div>
          <label className="block text-[11px] font-medium text-fg-muted">Board</label>
          <select
            name="boardId"
            required
            defaultValue={boards[0]?.id}
            className="mt-1 block w-full rounded border border-border bg-bg-primary px-2 py-1.5 font-mono text-xs text-fg-primary focus:border-accent focus:outline-none"
          >
            {boards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Title */}
      <div>
        <label className="block text-[11px] font-medium text-fg-muted">Title</label>
        <input
          name="title"
          type="text"
          required
          autoFocus
          placeholder="Task title"
          className="mt-1 block w-full rounded border border-border bg-bg-primary px-2 py-1.5 font-mono text-xs text-fg-primary placeholder-fg-muted focus:border-accent focus:outline-none"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-[11px] font-medium text-fg-muted">Description</label>
        <textarea
          name="description"
          rows={2}
          placeholder="(optional)"
          className="mt-1 block w-full resize-none rounded border border-border bg-bg-primary px-2 py-1.5 font-mono text-xs text-fg-primary placeholder-fg-muted focus:border-accent focus:outline-none"
        />
      </div>

      {/* Priority + Due Date + Points */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-[11px] font-medium text-fg-muted">Priority</label>
          <ColoredPrioritySelect value={priority} onChange={setPriority} />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-fg-muted">Due Date</label>
          <input
            name="dueDate"
            type="date"
            className="mt-1 block w-full rounded border border-border bg-bg-primary px-2 py-1.5 font-mono text-xs text-fg-primary focus:border-accent focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-fg-muted">Points</label>
          <input
            name="points"
            type="number"
            min="0"
            placeholder="0"
            className="mt-1 block w-full rounded border border-border bg-bg-primary px-2 py-1.5 font-mono text-xs text-fg-primary placeholder-fg-muted focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      {/* Sprint picker */}
      {sprints && sprints.length > 0 && (
        <div>
          <label className="block text-[11px] font-medium text-fg-muted">Sprint</label>
          <select
            value={selectedSprint}
            onChange={(e) => setSelectedSprint(e.target.value)}
            className="mt-1 block w-full rounded border border-border bg-bg-primary px-2 py-1.5 font-mono text-xs text-fg-primary focus:border-accent focus:outline-none"
          >
            <option value="">No sprint</option>
            {sprints.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Assignee picker */}
      {members && members.length > 0 && (
        <AssigneePicker members={members} selectedIds={selectedAssignees} onChange={setSelectedAssignees} />
      )}

      {/* Tag picker */}
      {tags && tags.length > 0 && (
        <div>
          <label className="block text-[11px] font-medium text-fg-muted">Tags</label>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {tags.map((tag) => {
              const color = tag.color ?? "#6B7280";
              const isSelected = selectedTags.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() =>
                    setSelectedTags((prev) => (isSelected ? prev.filter((id) => id !== tag.id) : [...prev, tag.id]))
                  }
                  className="cursor-pointer rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all hover:scale-105"
                  style={{
                    borderColor: color + (isSelected ? "80" : "40"),
                    color: isSelected ? "#fff" : color,
                    backgroundColor: isSelected ? color : color + "15",
                  }}
                >
                  {tag.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 border-t border-border pt-3">
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded px-3 py-1.5 text-xs text-fg-muted hover:text-fg-secondary"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="cursor-pointer rounded bg-accent px-3 py-1.5 text-xs font-medium text-bg-primary hover:bg-accent-emphasis disabled:opacity-50"
        >
          {pending ? "Creating..." : "Create"}
        </button>
      </div>
    </form>
  );
}

/* ─── Priority dropdown (matches PriorityPicker style) ────────────────── */

function ColoredPrioritySelect({ value, onChange }: { value: TaskPriority; onChange: (v: TaskPriority) => void }) {
  const [open, setOpen] = useState(false);
  const color = PRIORITY_COLORS[value];

  function handleSelect(p: TaskPriority) {
    onChange(p);
    setOpen(false);
  }

  return (
    <div className="relative mt-1">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors"
        style={{
          backgroundColor: color + "20",
          borderColor: color + "40",
          color: color,
        }}
      >
        <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
        {PRIORITY_LABELS[value]}
        <ChevronDown size={10} className={`ml-auto ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 w-full rounded-md border border-border bg-bg-elevated shadow-lg">
            {TASK_PRIORITIES.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => handleSelect(p)}
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-bg-secondary"
              >
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[p] }} />
                <span className={p === value ? "font-medium" : ""} style={{ color: PRIORITY_COLORS[p] }}>
                  {PRIORITY_LABELS[p]}
                </span>
                {p === value && <Check size={11} className="ml-auto text-accent" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Search-based assignee picker ─────────────────────────────────────── */

function AssigneePicker({
  members,
  selectedIds,
  onChange,
}: {
  members: MemberOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showSearch) inputRef.current?.focus();
  }, [showSearch]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSearch(false);
        setSearch("");
      }
    }
    if (showSearch) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showSearch]);

  const assigned = members.filter((m) => selectedIds.includes(m.id));
  const available = members.filter(
    (m) =>
      !selectedIds.includes(m.id) &&
      (m.name?.toLowerCase().includes(search.toLowerCase()) || m.email?.toLowerCase().includes(search.toLowerCase())),
  );

  function add(id: string) {
    onChange([...selectedIds, id]);
    setSearch("");
  }

  function remove(id: string) {
    onChange(selectedIds.filter((a) => a !== id));
  }

  return (
    <div>
      <label className="block text-[11px] font-medium text-fg-muted">Assignees</label>

      {/* Selected chips */}
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {assigned.map((m) => (
          <span
            key={m.id}
            className="flex items-center gap-1.5 rounded-full border border-border bg-bg-secondary px-2 py-0.5 text-xs text-fg-primary"
          >
            <UserAvatar name={m.name} image={m.image} size={16} />
            {m.name ?? m.email ?? "Unknown"}
            <button type="button" onClick={() => remove(m.id)} className="text-fg-muted hover:text-accent-emphasis">
              <X size={10} />
            </button>
          </span>
        ))}

        {/* Add button / search */}
        {!showSearch ? (
          <button
            type="button"
            onClick={() => setShowSearch(true)}
            className="cursor-pointer flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-0.5 text-xs text-fg-muted hover:border-accent/40 hover:text-accent"
          >
            <Plus size={10} />
            Add
          </button>
        ) : (
          <div ref={dropdownRef} className="relative w-full mt-1">
            <div className="flex items-center gap-1.5 rounded-md border border-border bg-bg-primary px-2 py-1">
              <Search size={12} className="text-fg-muted" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="flex-1 bg-transparent font-mono text-xs text-fg-primary placeholder-fg-muted outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  setShowSearch(false);
                  setSearch("");
                }}
                className="text-fg-muted hover:text-fg-secondary"
              >
                <X size={12} />
              </button>
            </div>

            {available.length > 0 && (
              <div className="absolute left-0 top-full z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-md border border-border bg-bg-elevated shadow-lg">
                {available.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => add(m.id)}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-fg-primary hover:bg-bg-secondary"
                  >
                    <UserAvatar name={m.name} image={m.image} size={18} />
                    <div className="min-w-0 text-left">
                      <span className="block truncate">{m.name ?? "Unknown"}</span>
                      {m.email && <span className="block truncate text-[10px] text-fg-muted">{m.email}</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {available.length === 0 && search && (
              <div className="absolute left-0 top-full z-10 mt-1 w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-xs text-fg-muted shadow-lg">
                No matching members
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
