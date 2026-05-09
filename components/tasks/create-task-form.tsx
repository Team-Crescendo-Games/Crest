"use client";

import { useActionState, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Search, ChevronDown, Check } from "lucide-react";
import { createTask } from "@/lib/actions/task";
import { UserAvatar } from "@/components/common/user-avatar";
import { TASK_STATUSES, STATUS_LABELS, STATUS_COLORS, TASK_PRIORITIES, PRIORITY_LABELS, PRIORITY_COLORS } from "@/lib/task-enums";
import type { TaskStatus, TaskPriority } from "@/prisma/generated/prisma/enums";

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

export interface TaskDefaults {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  points?: number | null;
  assigneeIds?: string[];
  tagIds?: string[];
  sprintId?: string;
}

/**
 * Unified task creation form used across board, sprint, and member views.
 * Also supports "duplicate" mode when given defaults and mode="duplicate".
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
      <TaskFormModal
        workspaceId={workspaceId}
        boardId={boardId}
        boards={boards}
        defaults={{ status: defaultStatus, assigneeIds: assigneeId ? [assigneeId] : [], sprintId: sprintId }}
        sprints={sprints}
        members={members}
        tags={tags}
        state={state}
        action={action}
        pending={pending}
        onClose={() => setOpen(false)}
        mode="create"
      />
    </div>
  );
}

/**
 * Standalone modal for creating a task. Like DuplicateTaskFormModal but starts blank
 * and supports an optional board picker. Used by flow view to create + link a new task.
 */
export function CreateTaskFormModal({
  workspaceId,
  boardId,
  boards,
  defaults,
  sprints,
  members,
  tags,
  title,
  onClose,
  onCreated,
}: {
  workspaceId: string;
  boardId?: string;
  boards?: BoardOption[];
  defaults?: TaskDefaults;
  sprints?: SprintOption[];
  members?: MemberOption[];
  tags?: TagOption[];
  title?: string;
  onClose: () => void;
  onCreated?: (newTaskId: string) => void;
}) {
  const [state, action, pending] = useActionState(async (prev: unknown, formData: FormData) => {
    const result = await createTask(prev, formData);
    if (result?.success && result.newTaskId) {
      onCreated?.(result.newTaskId);
    }
    return result;
  }, null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <TaskFormModal
        workspaceId={workspaceId}
        boardId={boardId}
        boards={boards}
        defaults={defaults ?? {}}
        sprints={sprints}
        members={members}
        tags={tags}
        state={state}
        action={action}
        pending={pending}
        onClose={onClose}
        mode="create"
        titleOverride={title}
      />
    </div>
  );
}

/**
 * Standalone modal for duplicating a task, used by TaskActions.
 */
export function DuplicateTaskFormModal({
  workspaceId,
  boardId,
  defaults,
  sprints,
  members,
  tags,
  onClose,
  onCreated,
}: {
  workspaceId: string;
  boardId: string;
  defaults: TaskDefaults;
  sprints?: SprintOption[];
  members?: MemberOption[];
  tags?: TagOption[];
  onClose: () => void;
  onCreated?: (newTaskId: string) => void;
}) {
  const router = useRouter();

  const [state, action, pending] = useActionState(async (prev: unknown, formData: FormData) => {
    const result = await createTask(prev, formData);
    if (result?.success && result.newTaskId) {
      if (onCreated) {
        onCreated(result.newTaskId);
      } else {
        router.push(`/w/${workspaceId}/b/${boardId}/t/${result.newTaskId}`);
      }
    }
    return result;
  }, null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <TaskFormModal
        workspaceId={workspaceId}
        boardId={boardId}
        defaults={defaults}
        sprints={sprints}
        members={members}
        tags={tags}
        state={state}
        action={action}
        pending={pending}
        onClose={onClose}
        mode="duplicate"
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Shared modal used by both Create and Duplicate flows
   ═══════════════════════════════════════════════════════════════════════════ */

function TaskFormModal({
  workspaceId,
  boardId,
  boards,
  defaults,
  sprints,
  members,
  tags,
  state,
  action,
  pending,
  onClose,
  mode,
  titleOverride,
}: {
  workspaceId: string;
  boardId?: string;
  boards?: BoardOption[];
  defaults: TaskDefaults;
  sprints?: SprintOption[];
  members?: MemberOption[];
  tags?: TagOption[];
  state: { error?: string; success?: boolean } | null;
  action: (payload: FormData) => void;
  pending: boolean;
  onClose: () => void;
  mode: "create" | "duplicate";
  titleOverride?: string;
}) {
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>(defaults.assigneeIds ?? []);
  const [selectedTags, setSelectedTags] = useState<string[]>(defaults.tagIds ?? []);
  const [selectedSprint, setSelectedSprint] = useState(defaults.sprintId ?? "");
  const [priority, setPriority] = useState<TaskPriority>((defaults.priority as TaskPriority) ?? "NONE");
  const [status, setStatus] = useState<TaskStatus>((defaults.status as TaskStatus) ?? "NOT_STARTED");

  const showBoardPicker = !boardId && boards && boards.length > 0;
  const isDuplicate = mode === "duplicate";

  return (
    <form
      action={action}
      onClick={(e) => e.stopPropagation()}
      className="w-full max-w-md max-h-[90vh] overflow-y-auto space-y-3 rounded-md border border-border bg-bg-elevated p-4 shadow-lg"
    >
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="status" value={status} />
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
        <h3 className="font-mono text-xs font-medium text-fg-primary">
          {titleOverride ?? (isDuplicate ? "Duplicate Task" : "New Task")}
        </h3>
        <button type="button" onClick={onClose} className="cursor-pointer text-fg-muted hover:text-fg-secondary" aria-label="Close">
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
          defaultValue={defaults.title ?? ""}
          placeholder="Task title"
          className="mt-1 block w-full rounded border border-border bg-bg-primary px-2 py-1.5 font-mono text-xs text-fg-primary placeholder-fg-muted focus:border-accent focus:outline-none"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-[11px] font-medium text-fg-muted">Description</label>
        <ResizableTextarea
          name="description"
          defaultValue={defaults.description ?? ""}
          placeholder="Add a description..."
        />
      </div>

      {/* Status + Priority + Points */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-[11px] font-medium text-fg-muted">Status</label>
          <StatusSelect value={status} onChange={setStatus} />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-fg-muted">Priority</label>
          <PrioritySelect value={priority} onChange={setPriority} />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-fg-muted">Points</label>
          <input
            name="points"
            type="number"
            min="0"
            defaultValue={defaults.points ?? ""}
            placeholder="0"
            className="mt-1 block w-full rounded border border-border bg-bg-primary px-2 py-1.5 font-mono text-xs text-fg-primary placeholder-fg-muted focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      {/* Due Date */}
      <div>
        <label className="block text-[11px] font-medium text-fg-muted">Due Date</label>
        <input
          name="dueDate"
          type="date"
          defaultValue={defaults.dueDate ?? ""}
          className="mt-1 block w-full rounded border border-border bg-bg-primary px-2 py-1.5 font-mono text-xs text-fg-primary focus:border-accent focus:outline-none"
        />
      </div>

      {/* Sprint picker */}
      {sprints && sprints.length > 0 && (
        <SprintDropdown sprints={sprints} value={selectedSprint} onChange={setSelectedSprint} />
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
          {pending ? "Creating..." : isDuplicate ? "Create Duplicate" : "Create"}
        </button>
      </div>
    </form>
  );
}

/* ─── Resizable textarea with drag handle ─────────────────────────────── */

function ResizableTextarea({
  name,
  defaultValue,
  placeholder,
}: {
  name: string;
  defaultValue: string;
  placeholder: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [height, setHeight] = useState<number | null>(null);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startH = useRef(0);
  const minHeight = 72;

  function onPointerDown(e: React.PointerEvent) {
    e.preventDefault();
    dragging.current = true;
    startY.current = e.clientY;
    startH.current = textareaRef.current?.getBoundingClientRect().height ?? minHeight;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current) return;
    const delta = e.clientY - startY.current;
    setHeight(Math.max(minHeight, startH.current + delta));
  }

  function onPointerUp() {
    dragging.current = false;
  }

  return (
    <div className="mt-1">
      <textarea
        ref={textareaRef}
        name={name}
        rows={3}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="block w-full resize-none rounded-md border border-border bg-bg-primary px-3 py-2 font-mono text-sm text-fg-primary placeholder-fg-muted transition-colors outline-none focus:border-accent focus:ring-1 focus:ring-accent/50"
        style={{ minHeight, height: height ?? undefined }}
      />
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="group flex cursor-row-resize items-center justify-center py-1"
      >
        <div className="h-0.5 w-8 rounded-full bg-transparent transition-colors group-hover:bg-border" />
      </div>
    </div>
  );
}

/* ─── Status dropdown ─────────────────────────────────────────────────── */

function StatusSelect({ value, onChange }: { value: TaskStatus; onChange: (v: TaskStatus) => void }) {
  const [open, setOpen] = useState(false);
  const color = STATUS_COLORS[value];

  function handleSelect(s: TaskStatus) {
    onChange(s);
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
        {STATUS_LABELS[value]}
        <ChevronDown size={10} className={`ml-auto ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 w-full rounded-md border border-border bg-bg-elevated shadow-lg">
            {TASK_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleSelect(s)}
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-bg-secondary"
              >
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[s] }} />
                <span className={s === value ? "font-medium" : ""} style={{ color: STATUS_COLORS[s] }}>
                  {STATUS_LABELS[s]}
                </span>
                {s === value && <Check size={11} className="ml-auto text-accent" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Priority dropdown ───────────────────────────────────────────────── */

function PrioritySelect({ value, onChange }: { value: TaskPriority; onChange: (v: TaskPriority) => void }) {
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

/* ─── Sprint dropdown ─────────────────────────────────────────────────── */

function SprintDropdown({
  sprints,
  value,
  onChange,
}: {
  sprints: SprintOption[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = sprints.find((s) => s.id === value);

  function handleSelect(id: string) {
    onChange(id === value ? "" : id);
    setOpen(false);
  }

  return (
    <div>
      <label className="block text-[11px] font-medium text-fg-muted">Sprint</label>
      <div className="relative mt-1">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex w-full cursor-pointer items-center gap-1.5 rounded-md border border-border bg-bg-primary px-2 py-1.5 text-xs transition-colors hover:border-accent/40"
        >
          <span className={selected ? "font-medium text-fg-primary" : "text-fg-muted"}>
            {selected ? selected.title : "No sprint"}
          </span>
          <ChevronDown size={10} className={`ml-auto text-fg-muted ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute left-0 top-full z-20 mt-1 w-full rounded-md border border-border bg-bg-elevated shadow-lg">
              <button
                type="button"
                onClick={() => { onChange(""); setOpen(false); }}
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-xs text-fg-muted transition-colors hover:bg-bg-secondary"
              >
                No sprint
                {!value && <Check size={11} className="ml-auto text-accent" />}
              </button>
              {sprints.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSelect(s.id)}
                  className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-bg-secondary"
                >
                  <span className={s.id === value ? "font-medium text-fg-primary" : "text-fg-secondary"}>
                    {s.title}
                  </span>
                  {s.id === value && <Check size={11} className="ml-auto text-accent" />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
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
            <button type="button" onClick={() => remove(m.id)} className="cursor-pointer text-fg-muted hover:text-accent-emphasis">
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
                className="cursor-pointer text-fg-muted hover:text-fg-secondary"
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
                    className="cursor-pointer flex w-full items-center gap-2 px-3 py-1.5 text-xs text-fg-primary hover:bg-bg-secondary"
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
