"use client";

import { useActionState, useState } from "react";
import { updateTask, deleteTask } from "@/lib/actions/task";
import { setTaskTags } from "@/lib/actions/tag";
import { Trash2, X, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { UserAvatar } from "@/components/user-avatar";

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
  const router = useRouter();
  const [assigneeIds, setAssigneeIds] = useState<string[]>(task.assigneeIds);
  const [state, action, pending] = useActionState(updateTask, null);
  const [, deleteAction, deletePending] = useActionState(
    async (prev: unknown, formData: FormData) => {
      const result = await deleteTask(prev, formData);
      if (result?.success) {
        router.push(`/dashboard/workspaces/${workspaceId}/boards/${boardId}`);
      }
      return result;
    },
    null,
  );

  return (
    <div>
      <form action={action} className="space-y-4">
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
          defaultValue={task.title}
          required
          className="block w-full rounded-md border border-border bg-bg-primary px-3 py-2 font-mono text-base font-semibold text-fg-primary transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/50"
        />

        {/* Description */}
        <textarea
          name="description"
          defaultValue={task.description ?? ""}
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
            <select
              name="status"
              defaultValue={task.status}
              className="mt-1 block w-full rounded-md border border-border bg-bg-primary px-2 py-1.5 font-mono text-xs text-fg-primary focus:border-accent focus:outline-none"
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
              defaultValue={task.priority}
              className="mt-1 block w-full rounded-md border border-border bg-bg-primary px-2 py-1.5 font-mono text-xs text-fg-primary focus:border-accent focus:outline-none"
            >
              <option value="NONE">None</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
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
              defaultValue={task.startDate}
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
              defaultValue={task.dueDate}
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
            defaultValue={task.points ?? ""}
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

        <div className="flex items-center justify-between pt-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-accent px-4 py-2 text-xs font-medium text-bg-primary transition-all hover:bg-accent-emphasis disabled:opacity-50"
          >
            {pending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>

      {/* Tags */}
      <TagPicker
        taskId={task.id}
        workspaceId={workspaceId}
        tags={tags}
        selectedTagIds={task.tagIds}
      />

      {/* Delete */}
      <form action={deleteAction} className="mt-4 border-t border-border pt-4">
        <input type="hidden" name="taskId" value={task.id} />
        <button
          type="submit"
          disabled={deletePending}
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-fg-muted transition-colors hover:bg-accent-emphasis/10 hover:text-accent-emphasis disabled:opacity-50"
          onClick={(e) => {
            if (!confirm("Delete this task? This cannot be undone.")) {
              e.preventDefault();
            }
          }}
        >
          <Trash2 size={12} />
          {deletePending ? "Deleting..." : "Delete task"}
        </button>
      </form>
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
  taskId,
  workspaceId,
  tags,
  selectedTagIds,
}: {
  taskId: string;
  workspaceId: string;
  tags: { id: string; name: string; color: string | null }[];
  selectedTagIds: string[];
}) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(selectedTagIds),
  );
  const [state, action, pending] = useActionState(setTaskTags, null);

  if (tags.length === 0) return null;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <form action={action} className="mt-4 border-t border-border pt-4">
      <input type="hidden" name="taskId" value={taskId} />
      <input type="hidden" name="workspaceId" value={workspaceId} />
      {/* Hidden inputs for selected tag IDs */}
      {Array.from(selected).map((id) => (
        <input key={id} type="hidden" name="tagIds" value={id} />
      ))}

      <label className="block text-[11px] font-medium text-fg-muted">
        Tags
      </label>

      {state?.success && (
        <p className="mt-1 text-[11px] text-accent">Tags updated.</p>
      )}
      {state?.error && (
        <p className="mt-1 text-[11px] text-accent-emphasis">{state.error}</p>
      )}

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

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded bg-accent/10 px-2 py-1 text-[11px] font-medium text-accent hover:bg-accent/20 disabled:opacity-50"
      >
        {pending ? "Saving..." : "Update Tags"}
      </button>
    </form>
  );
}
