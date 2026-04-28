"use client";

import { useActionState, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateTask, getFlowGraphTasks } from "@/lib/actions/task";
import { X, Plus, Search, ChevronDown, Check, Calendar } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { FlowCanvas } from "@/components/flow-view";
import { TaskActions, FlowModeButton } from "./task-actions";
import { DeleteTaskButton } from "./delete-task-button";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  TASK_STATUSES,
  TASK_PRIORITIES,
} from "@/lib/task-enums";
import type { TaskStatus, TaskPriority } from "@/prisma/generated/prisma/enums";

interface TaskData {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  points: number | null;
  assigneeIds: string[];
  tagIds: string[];
  boardId: string;
  sprintIds: string[];
}

interface Props {
  task: TaskData;
  members: {
    id: string;
    name: string | null;
    email: string | null;
    image?: string | null;
  }[];
  tags: { id: string; name: string; color: string | null }[];
  boards: { id: string; name: string }[];
  sprints: { id: string; title: string }[];
  workspaceId: string;
  boardId: string;
  authorId: string;
  authorName: string | null;
  authorImage: string | null;
  /** Maps userId → workspaceMemberId for profile links */
  memberIdMap: Record<string, string>;
}

export function TaskEditForm({
  task,
  members,
  tags,
  boards,
  sprints,
  workspaceId,
  boardId,
  authorId,
  authorName,
  authorImage,
  memberIdMap,
}: Props) {
  const router = useRouter();

  // ── All form state ──
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [dueDate, setDueDate] = useState(task.dueDate);
  const [points, setPoints] = useState(task.points?.toString() ?? "");
  const [assigneeIds, setAssigneeIds] = useState<string[]>(task.assigneeIds);
  const [tagIds, setTagIds] = useState<string[]>(task.tagIds);
  const [selectedBoardId, setSelectedBoardId] = useState(task.boardId);
  const [sprintIds, setSprintIds] = useState<string[]>(task.sprintIds);
  const [flowOpen, setFlowOpen] = useState(false);
  const [flowTasks, setFlowTasks] = useState<Awaited<
    ReturnType<typeof getFlowGraphTasks>
  > | null>(null);
  const [flowLoading, setFlowLoading] = useState(false);

  // Fetch the dependency graph when flow mode is opened
  useEffect(() => {
    if (!flowOpen) {
      setFlowTasks(null);
      return;
    }
    let cancelled = false;
    setFlowLoading(true);
    getFlowGraphTasks(task.id, workspaceId)
      .then((result) => {
        if (!cancelled) setFlowTasks(result);
      })
      .catch(() => {
        if (!cancelled) setFlowTasks(null);
      })
      .finally(() => {
        if (!cancelled) setFlowLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [flowOpen, task.id, workspaceId]);

  const [state, formAction, pending] = useActionState(
    async (prev: unknown, formData: FormData) => {
      const result = await updateTask(prev, formData);
      if (result?.success && result.newBoardId) {
        router.push(
          `/dashboard/workspaces/${workspaceId}/boards/${result.newBoardId}/tasks/${task.id}`,
        );
      }
      return result;
    },
    null,
  );

  const isDirty =
    title !== task.title ||
    description !== (task.description ?? "") ||
    status !== task.status ||
    priority !== task.priority ||
    dueDate !== task.dueDate ||
    points !== (task.points?.toString() ?? "") ||
    selectedBoardId !== task.boardId ||
    JSON.stringify(assigneeIds.slice().sort()) !==
      JSON.stringify(task.assigneeIds.slice().sort()) ||
    JSON.stringify(tagIds.slice().sort()) !==
      JSON.stringify(task.tagIds.slice().sort()) ||
    JSON.stringify(sprintIds.slice().sort()) !==
      JSON.stringify(task.sprintIds.slice().sort());

  function reset() {
    setTitle(task.title);
    setDescription(task.description ?? "");
    setStatus(task.status);
    setPriority(task.priority);
    setDueDate(task.dueDate);
    setPoints(task.points?.toString() ?? "");
    setAssigneeIds(task.assigneeIds);
    setTagIds(task.tagIds);
    setSelectedBoardId(task.boardId);
    setSprintIds(task.sprintIds);
  }

  const formId = `task-edit-${task.id}`;

  return (
    <>
      {/* Hidden form that carries all state */}
      <form id={formId} action={formAction} className="hidden">
        <input type="hidden" name="taskId" value={task.id} />
        <input type="hidden" name="workspaceId" value={workspaceId} />
        <input type="hidden" name="title" value={title} />
        <input type="hidden" name="description" value={description} />
        <input type="hidden" name="status" value={status} />
        <input type="hidden" name="priority" value={priority} />
        <input type="hidden" name="dueDate" value={dueDate} />
        <input type="hidden" name="points" value={points} />
        <input type="hidden" name="boardId" value={selectedBoardId} />
        {assigneeIds.map((id) => (
          <input key={id} type="hidden" name="assigneeIds" value={id} />
        ))}
        {tagIds.map((id) => (
          <input key={id} type="hidden" name="tagIds" value={id} />
        ))}
        {sprintIds.map((id) => (
          <input key={id} type="hidden" name="sprintIds" value={id} />
        ))}
      </form>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-[1fr_240px]">
        {/* ── Left column: main content ── */}
        <div className="space-y-4">
          {state?.success && (
            <div className="rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-xs text-accent">
              Task updated.
            </div>
          )}
          {state?.error && (
            <div className="rounded-md border border-accent-emphasis/30 bg-accent-emphasis/10 px-3 py-2 text-xs text-accent-emphasis">
              {state.error}
            </div>
          )}

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="block w-full rounded-md border border-border bg-bg-primary px-3 py-2 font-mono text-base font-semibold text-fg-primary transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/50"
          />

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="block w-full resize-none rounded-md border border-border bg-bg-primary px-3 py-2 font-mono text-sm text-fg-primary placeholder-fg-muted transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/50"
            placeholder="Add a description..."
          />

          <div>
            <label className="block text-[11px] font-medium text-fg-muted">
              Points
            </label>
            <input
              type="number"
              min={0}
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              className="mt-1 block w-24 rounded-md border border-border bg-bg-primary px-2 py-1.5 font-mono text-xs text-fg-primary focus:border-accent focus:outline-none"
              placeholder="—"
            />
          </div>

          <AssigneeEditor
            members={members}
            assigneeIds={assigneeIds}
            onChange={setAssigneeIds}
            workspaceId={workspaceId}
            memberIdMap={memberIdMap}
          />

          {tags.length > 0 && (
            <TagEditor
              tags={tags}
              selectedTagIds={tagIds}
              onChange={setTagIds}
            />
          )}

          {/* Action row */}
          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
            <button
              type="submit"
              form={formId}
              disabled={pending || !isDirty}
              className={`rounded-md px-4 py-2 text-xs font-medium transition-all ${
                isDirty
                  ? "bg-accent text-bg-primary hover:bg-accent-emphasis disabled:opacity-50"
                  : "bg-bg-secondary text-fg-muted cursor-not-allowed"
              }`}
            >
              {pending ? "Saving..." : "Save Changes"}
            </button>

            {isDirty && (
              <button
                type="button"
                onClick={reset}
                className="rounded-md border border-border px-4 py-2 text-xs font-medium text-fg-muted transition-colors hover:border-accent/30 hover:text-fg-secondary"
              >
                Reset
              </button>
            )}

            <TaskActions
              taskId={task.id}
              workspaceId={workspaceId}
              boardId={boardId}
              source={{
                title: task.title,
                description: task.description,
                status: task.status,
                priority: task.priority,
                dueDate: task.dueDate,
                points: task.points,
                assigneeIds: task.assigneeIds,
              }}
              members={members}
            />

            <FlowModeButton
              active={flowOpen}
              onToggle={() => setFlowOpen((v) => !v)}
            />

            <DeleteTaskButton
              taskId={task.id}
              workspaceId={workspaceId}
              boardId={boardId}
            />
          </div>
        </div>

        {/* ── Right column: sidebar metadata ── */}
        <div className="space-y-4">
          <SidebarBlock label="Status">
            <DropdownPicker
              value={status}
              onChange={(v) => setStatus(v as TaskStatus)}
              options={TASK_STATUSES.map((s) => ({
                value: s,
                label: STATUS_LABELS[s],
                color: STATUS_COLORS[s],
              }))}
            />
          </SidebarBlock>

          <SidebarBlock label="Priority">
            <DropdownPicker
              value={priority}
              onChange={(v) => setPriority(v as TaskPriority)}
              options={TASK_PRIORITIES.map((p) => ({
                value: p,
                label: PRIORITY_LABELS[p],
                color: PRIORITY_COLORS[p],
              }))}
            />
          </SidebarBlock>

          <SidebarBlock label="Due Date">
            <div className="flex items-center gap-1.5">
              <Calendar size={10} className="shrink-0 text-fg-muted" />
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded border border-border bg-bg-primary px-1.5 py-1 font-mono text-[11px] text-fg-primary focus:border-accent focus:outline-none"
              />
              {dueDate && (
                <button
                  type="button"
                  onClick={() => setDueDate("")}
                  className="shrink-0 rounded p-0.5 text-fg-muted hover:text-red-400"
                  title="Clear due date"
                >
                  <X size={10} />
                </button>
              )}
            </div>
          </SidebarBlock>

          <SidebarBlock label="Author">
            {memberIdMap[authorId] ? (
              <Link
                href={`/dashboard/workspaces/${workspaceId}/team/${memberIdMap[authorId]}`}
                className="flex items-center gap-1.5 text-[11px] text-fg-primary transition-colors hover:text-accent"
              >
                <UserAvatar name={authorName} image={authorImage} size={18} />
                {authorName}
              </Link>
            ) : (
              <div className="flex items-center gap-1.5 text-[11px] text-fg-primary">
                <UserAvatar name={authorName} image={authorImage} size={18} />
                {authorName}
              </div>
            )}
          </SidebarBlock>

          <SidebarBlock label="Board">
            <BoardField
              value={selectedBoardId}
              onChange={setSelectedBoardId}
              options={boards.map((b) => ({ value: b.id, label: b.name }))}
              href={`/dashboard/workspaces/${workspaceId}/boards/${selectedBoardId}`}
            />
          </SidebarBlock>

          <SidebarBlock label="Sprints">
            <SprintEditor
              sprints={sprints}
              selectedIds={sprintIds}
              onChange={setSprintIds}
              workspaceId={workspaceId}
            />
          </SidebarBlock>
        </div>
      </div>

      {/* ── Flow mode: dependency graph ── */}
      {flowOpen && (
        <div className="mt-6">
          {flowLoading ? (
            <div className="flex items-center justify-center rounded-md border border-border bg-bg-primary py-16">
              <p className="font-mono text-sm text-fg-muted animate-pulse">
                Loading dependency graph…
              </p>
            </div>
          ) : flowTasks ? (
            <FlowCanvas
              tasks={flowTasks as Parameters<typeof FlowCanvas>[0]["tasks"]}
              rootId={task.id}
              workspaceId={workspaceId}
              onBack={() => setFlowOpen(false)}
            />
          ) : (
            <div className="flex items-center justify-center rounded-md border border-border bg-bg-primary py-16">
              <p className="font-mono text-sm text-fg-muted">
                Could not load dependency graph.
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}

/* ── Sidebar block ─────────────────────────────────────────────────────── */

function SidebarBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-fg-muted">
        {label}
      </p>
      {children}
    </div>
  );
}

/* ── Generic dropdown picker (status, priority, board) ─────────────────── */

function DropdownPicker({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; color?: string }[];
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value) ?? options[0];
  const color = current.color;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors"
        style={color ? { backgroundColor: color + "20", color } : undefined}
      >
        {color && (
          <div
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: color }}
          />
        )}
        {current.label}
        <ChevronDown size={9} className={open ? "rotate-180" : ""} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 max-h-48 w-44 overflow-y-auto rounded-md border border-border bg-bg-elevated shadow-lg">
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-bg-secondary"
              >
                {o.color && (
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: o.color }}
                  />
                )}
                <span
                  className={o.value === value ? "font-medium" : ""}
                  style={o.color ? { color: o.color } : undefined}
                >
                  {o.label}
                </span>
                {o.value === value && (
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

/* ── Board field: clickable name link + chevron to change ──────────────── */

function BoardField({
  value,
  onChange,
  options,
  href,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  href: string;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value) ?? options[0];

  return (
    <div className="relative flex items-center gap-1">
      <Link
        href={href}
        className="text-[11px] text-accent transition-colors hover:text-accent-emphasis"
      >
        {current.label}
      </Link>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="shrink-0 rounded p-0.5 text-fg-muted transition-colors hover:bg-bg-secondary hover:text-fg-secondary"
        title="Change board"
      >
        <ChevronDown size={10} className={open ? "rotate-180" : ""} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 max-h-48 w-44 overflow-y-auto rounded-md border border-border bg-bg-elevated shadow-lg">
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-bg-secondary"
              >
                <span
                  className={
                    o.value === value
                      ? "font-medium text-accent"
                      : "text-fg-primary"
                  }
                >
                  {o.label}
                </span>
                {o.value === value && (
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

/* ── Sprint multi-select editor ────────────────────────────────────────── */

function SprintEditor({
  sprints,
  selectedIds,
  onChange,
  workspaceId,
}: {
  sprints: { id: string; title: string }[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  workspaceId: string;
}) {
  const [open, setOpen] = useState(false);

  function toggle(id: string) {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id],
    );
  }

  const selected = sprints.filter((s) => selectedIds.includes(s.id));

  return (
    <div className="relative">
      {selected.length > 0 ? (
        <div className="space-y-0.5">
          {selected.map((s) => (
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

      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="mt-1 flex items-center gap-1 text-[10px] text-fg-muted transition-colors hover:text-fg-secondary"
      >
        <Plus size={10} />
        {selected.length > 0 ? "Edit sprints" : "Add to sprint"}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 w-52 rounded-md border border-border bg-bg-elevated shadow-lg">
            <div className="max-h-48 overflow-y-auto p-1">
              {sprints.length === 0 && (
                <p className="px-3 py-2 text-[11px] text-fg-muted">
                  No sprints
                </p>
              )}
              {sprints.map((sprint) => {
                const isSelected = selectedIds.includes(sprint.id);
                return (
                  <button
                    key={sprint.id}
                    type="button"
                    onClick={() => toggle(sprint.id)}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-bg-secondary"
                  >
                    <div
                      className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${
                        isSelected ? "border-accent bg-accent" : "border-border"
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
            <div className="flex justify-end border-t border-border px-2 py-1.5">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded bg-accent px-2 py-1 text-[11px] font-medium text-bg-primary hover:bg-accent-emphasis"
              >
                Done
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Assignee editor ───────────────────────────────────────────────────── */

function AssigneeEditor({
  members,
  assigneeIds,
  onChange,
  workspaceId,
  memberIdMap,
}: {
  members: {
    id: string;
    name: string | null;
    email: string | null;
    image?: string | null;
  }[];
  assigneeIds: string[];
  onChange: (ids: string[]) => void;
  workspaceId: string;
  memberIdMap: Record<string, string>;
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [search, setSearch] = useState("");

  const assigned = members.filter((m) => assigneeIds.includes(m.id));
  const available = members.filter(
    (m) =>
      !assigneeIds.includes(m.id) &&
      (m.name?.toLowerCase().includes(search.toLowerCase()) ||
        m.email?.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div>
      <label className="block text-[11px] font-medium text-fg-muted">
        Assignees
      </label>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {assigned.map((m) => (
          <span
            key={m.id}
            className="flex items-center gap-1.5 rounded-full border border-border bg-bg-secondary px-2 py-0.5 text-xs text-fg-primary"
          >
            {memberIdMap[m.id] ? (
              <Link
                href={`/dashboard/workspaces/${workspaceId}/team/${memberIdMap[m.id]}`}
                className="flex items-center gap-1.5 transition-colors hover:text-accent"
              >
                <UserAvatar name={m.name} image={m.image} size={16} />
                {m.name ?? m.email}
              </Link>
            ) : (
              <>
                <UserAvatar name={m.name} image={m.image} size={16} />
                {m.name ?? m.email}
              </>
            )}
            <button
              type="button"
              onClick={() => onChange(assigneeIds.filter((a) => a !== m.id))}
              className="text-fg-muted hover:text-accent-emphasis"
            >
              <X size={10} />
            </button>
          </span>
        ))}

        {!showDropdown ? (
          <button
            type="button"
            onClick={() => setShowDropdown(true)}
            className="flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-0.5 text-xs text-fg-muted hover:border-accent/40 hover:text-accent"
          >
            <Plus size={10} />
            Add
          </button>
        ) : (
          <div className="relative mt-1 w-full">
            <div className="flex items-center gap-1.5 rounded-md border border-border bg-bg-primary px-2 py-1">
              <Search size={12} className="text-fg-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search members..."
                className="flex-1 bg-transparent font-mono text-xs text-fg-primary placeholder-fg-muted outline-none"
                autoFocus
              />
              <button
                type="button"
                onClick={() => {
                  setShowDropdown(false);
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
                    onClick={() => {
                      onChange([...assigneeIds, m.id]);
                      setSearch("");
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-fg-primary hover:bg-bg-secondary"
                  >
                    <UserAvatar name={m.name} image={m.image} size={18} />
                    <span>{m.name ?? m.email}</span>
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

/* ── Tag editor ────────────────────────────────────────────────────────── */

function TagEditor({
  tags,
  selectedTagIds,
  onChange,
}: {
  tags: { id: string; name: string; color: string | null }[];
  selectedTagIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const selected = new Set(selectedTagIds);

  return (
    <div>
      <label className="block text-[11px] font-medium text-fg-muted">
        Tags
      </label>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {tags.map((tag) => {
          const color = tag.color ?? "#6B7280";
          const isSelected = selected.has(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() =>
                onChange(
                  isSelected
                    ? selectedTagIds.filter((x) => x !== tag.id)
                    : [...selectedTagIds, tag.id],
                )
              }
              className="rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all"
              style={{
                borderColor: color + (isSelected ? "80" : "40"),
                color: isSelected ? "#fff" : color,
                backgroundColor: isSelected ? color : "transparent",
              }}
            >
              {tag.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
