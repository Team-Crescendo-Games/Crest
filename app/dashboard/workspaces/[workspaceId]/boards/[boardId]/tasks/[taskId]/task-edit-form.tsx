"use client";

import { useActionState, useState } from "react";
import { updateTask } from "@/lib/actions/task";
import { X, Plus, Search } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { TaskActions } from "./task-actions";
import { DeleteTaskButton } from "./delete-task-button";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  TASK_STATUSES,
  TASK_PRIORITIES,
} from "@/lib/task-enums";
import type {
  TaskStatus,
  TaskPriority,
} from "@/prisma/generated/prisma/enums";

interface Props {
  task: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    startDate: string;
    dueDate: string;
    points: number | null;
    assigneeIds: string[];
    tagIds: string[];
  };
  members: { id: string; name: string | null; email: string | null }[];
  tags: { id: string; name: string; color: string | null }[];
  workspaceId: string;
  boardId: string;
}

export function TaskEditForm({
  task,
  members,
  tags,
  workspaceId,
  boardId,
}: Props) {
  const [assigneeIds, setAssigneeIds] = useState<string[]>(task.assigneeIds);
  const [tagIds, setTagIds] = useState<string[]>(task.tagIds);
  const [status, setStatus] = useState<TaskStatus>(task.status as TaskStatus);
  const [priority, setPriority] = useState<TaskPriority>(
    task.priority as TaskPriority,
  );
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [startDate, setStartDate] = useState(task.startDate);
  const [dueDate, setDueDate] = useState(task.dueDate);
  const [points, setPoints] = useState(task.points?.toString() ?? "");
  const [state, action, pending] = useActionState(updateTask, null);

  const isDirty =
    title !== task.title ||
    description !== (task.description ?? "") ||
    status !== task.status ||
    priority !== task.priority ||
    startDate !== task.startDate ||
    dueDate !== task.dueDate ||
    points !== (task.points?.toString() ?? "") ||
    JSON.stringify(assigneeIds.slice().sort()) !==
      JSON.stringify(task.assigneeIds.slice().sort()) ||
    JSON.stringify(tagIds.slice().sort()) !==
      JSON.stringify(task.tagIds.slice().sort());

  function reset() {
    setTitle(task.title);
    setDescription(task.description ?? "");
    setStatus(task.status as TaskStatus);
    setPriority(task.priority as TaskPriority);
    setStartDate(task.startDate);
    setDueDate(task.dueDate);
    setPoints(task.points?.toString() ?? "");
    setAssigneeIds(task.assigneeIds);
    setTagIds(task.tagIds);
  }

  return (
    <div>
      <form id={`task-edit-${task.id}`} action={action} className="space-y-4">
        <input type="hidden" name="taskId" value={task.id} />

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

        {/* Title */}
        <input
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="block w-full rounded-md border border-border bg-bg-primary px-3 py-2 font-mono text-base font-semibold text-fg-primary transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/50"
        />

        {/* Description */}
        <textarea
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="block w-full resize-none rounded-md border border-border bg-bg-primary px-3 py-2 font-mono text-sm text-fg-primary placeholder-fg-muted transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/50"
          placeholder="Add a description..."
        />

        {/* Status + Priority row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-fg-muted">
              Status
            </label>
            <ColoredSelect
              name="status"
              value={status}
              onChange={(v) => setStatus(v as TaskStatus)}
              options={TASK_STATUSES.map((s) => ({
                value: s,
                label: STATUS_LABELS[s],
                color: STATUS_COLORS[s],
              }))}
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-fg-muted">
              Priority
            </label>
            <ColoredSelect
              name="priority"
              value={priority}
              onChange={(v) => setPriority(v as TaskPriority)}
              options={TASK_PRIORITIES.map((p) => ({
                value: p,
                label: PRIORITY_LABELS[p],
                color: PRIORITY_COLORS[p],
              }))}
            />
          </div>
        </div>

        {/* Dates row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-fg-muted">
              Start Date
            </label>
            <input
              name="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 block w-full rounded-md border border-border bg-bg-primary px-2 py-1.5 font-mono text-xs text-fg-primary focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-fg-muted">
              Due Date
            </label>
            <input
              name="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1 block w-full rounded-md border border-border bg-bg-primary px-2 py-1.5 font-mono text-xs text-fg-primary focus:border-accent focus:outline-none"
            />
          </div>
        </div>

        {/* Points */}
        <div>
          <label className="block text-[11px] font-medium text-fg-muted">
            Points
          </label>
          <input
            name="points"
            type="number"
            min={0}
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            className="mt-1 block w-24 rounded-md border border-border bg-bg-primary px-2 py-1.5 font-mono text-xs text-fg-primary focus:border-accent focus:outline-none"
            placeholder="—"
          />
        </div>

        {/* Assignees — managed by AssigneePicker below */}
        {assigneeIds.map((id) => (
          <input key={id} type="hidden" name="assigneeIds" value={id} />
        ))}

        {/* Assignee picker (visual, outside form submission) */}
        <AssigneePicker
          members={members}
          assigneeIds={assigneeIds}
          onChange={setAssigneeIds}
        />

        {/* Tags — state-driven with hidden inputs so they submit with the rest */}
        {tagIds.map((id) => (
          <input key={id} type="hidden" name="tagIds" value={id} />
        ))}
        {tags.length > 0 && (
          <TagPicker
            tags={tags}
            selectedTagIds={tagIds}
            onChange={setTagIds}
          />
        )}
      </form>

      {/* Action row: Save, Copy link, Duplicate, Delete.
          Duplicate and Delete need their own forms for server actions, so
          these buttons sit outside the edit form. The Save button uses the
          `form` attribute to still submit the edit form above. */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <button
          type="submit"
          form={`task-edit-${task.id}`}
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
            startDate: task.startDate,
            dueDate: task.dueDate,
            points: task.points,
            assigneeIds: task.assigneeIds,
          }}
          members={members}
        />

        <DeleteTaskButton
          taskId={task.id}
          workspaceId={workspaceId}
          boardId={boardId}
        />
      </div>
    </div>
  );
}

function AssigneePicker({
  members,
  assigneeIds,
  onChange,
}: {
  members: { id: string; name: string | null; email: string | null }[];
  assigneeIds: string[];
  onChange: (ids: string[]) => void;
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

  function add(id: string) {
    onChange([...assigneeIds, id]);
    setSearch("");
  }

  function remove(id: string) {
    onChange(assigneeIds.filter((a) => a !== id));
  }

  return (
    <div>
      <label className="block text-[11px] font-medium text-fg-muted">
        Assignees
      </label>

      {/* Currently assigned */}
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {assigned.map((m) => (
          <span
            key={m.id}
            className="flex items-center gap-1.5 rounded-full border border-border bg-bg-secondary px-2 py-0.5 text-xs text-fg-primary"
          >
            <UserAvatar name={m.name} image={null} size={16} />
            {m.name ?? m.email}
            <button
              type="button"
              onClick={() => remove(m.id)}
              className="text-fg-muted hover:text-accent-emphasis"
            >
              <X size={10} />
            </button>
          </span>
        ))}

        {/* Add button / search */}
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
          <div className="relative w-full mt-1">
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
                    onClick={() => add(m.id)}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-fg-primary hover:bg-bg-secondary"
                  >
                    <UserAvatar name={m.name} image={null} size={18} />
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

function TagPicker({
  tags,
  selectedTagIds,
  onChange,
}: {
  tags: { id: string; name: string; color: string | null }[];
  selectedTagIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const selected = new Set(selectedTagIds);

  function toggle(id: string) {
    onChange(
      selected.has(id)
        ? selectedTagIds.filter((x) => x !== id)
        : [...selectedTagIds, id],
    );
  }

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
              onClick={() => toggle(tag.id)}
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

/**
 * A <select> where the chosen option's color tints the select itself and
 * each dropdown option shows its own color.
 *
 * Uses a native <select> so the browser handles the dropdown UX. A colored
 * dot is shown inside the field to signal the current selection (since
 * native <select> background styling is inconsistent across browsers).
 */
function ColoredSelect({
  name,
  value,
  onChange,
  options,
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; color: string }[];
}) {
  const current = options.find((o) => o.value === value) ?? options[0];

  return (
    <div className="relative mt-1">
      <div
        aria-hidden
        className="pointer-events-none absolute left-2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full"
        style={{ backgroundColor: current.color }}
      />
      <select
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          backgroundColor: current.color + "15",
          borderColor: current.color + "40",
          color: current.color,
        }}
        className="block w-full cursor-pointer rounded-md border py-1.5 pl-6 pr-2 font-mono text-xs font-medium focus:outline-none focus:ring-1"
      >
        {options.map((o) => (
          <option
            key={o.value}
            value={o.value}
            style={{
              color: o.color,
              backgroundColor: "var(--bg-elevated)",
            }}
          >
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
