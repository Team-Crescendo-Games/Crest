"use client";

import { useActionState, useState } from "react";
import { assignTaskToSprint, removeTaskFromSprint } from "@/lib/actions/sprint";
import { Plus, X, Search } from "lucide-react";

interface UnassignedTask {
  id: string;
  title: string;
  status: string;
  board: { name: string };
}

export function AssignTaskSection({
  sprintId,
  workspaceId,
  assignedTaskIds,
  unassignedTasks,
}: {
  sprintId: string;
  workspaceId: string;
  assignedTaskIds: string[];
  unassignedTasks: UnassignedTask[];
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = unassignedTasks.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.board.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-xs font-medium text-fg-secondary">
          Tasks in Sprint ({assignedTaskIds.length})
        </h3>
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="flex items-center gap-1 rounded-md border border-border bg-bg-secondary px-2 py-1 text-xs text-fg-secondary transition-colors hover:border-accent/40 hover:text-accent"
        >
          {showPicker ? <X size={11} /> : <Plus size={11} />}
          {showPicker ? "Close" : "Add Tasks"}
        </button>
      </div>

      {showPicker && (
        <div className="mt-3 rounded-md border border-border bg-bg-elevated/80 p-3 backdrop-blur-sm">
          <div className="relative mb-2">
            <Search
              size={12}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-fg-muted"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks to add..."
              className="w-full rounded border border-border bg-bg-primary py-1.5 pl-7 pr-3 font-mono text-xs text-fg-primary placeholder-fg-muted focus:border-accent focus:outline-none"
            />
          </div>

          <div className="max-h-48 space-y-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="py-3 text-center text-xs text-fg-muted">
                {search
                  ? "No matching tasks"
                  : "All tasks are already assigned"}
              </p>
            ) : (
              filtered.map((task) => (
                <AssignRow
                  key={task.id}
                  task={task}
                  sprintId={sprintId}
                  workspaceId={workspaceId}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AssignRow({
  task,
  sprintId,
  workspaceId,
}: {
  task: UnassignedTask;
  sprintId: string;
  workspaceId: string;
}) {
  const [state, action, pending] = useActionState(assignTaskToSprint, null);

  if (state?.success) {
    return (
      <div className="flex items-center gap-2 rounded border border-accent/20 bg-accent/5 px-2 py-1.5 text-xs text-accent">
        ✓ {task.title}
      </div>
    );
  }

  return (
    <form
      action={action}
      className="flex items-center justify-between rounded border border-border-subtle px-2 py-1.5 hover:border-accent/20"
    >
      <input type="hidden" name="sprintId" value={sprintId} />
      <input type="hidden" name="taskId" value={task.id} />
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <div>
        <p className="font-mono text-xs text-fg-primary">{task.title}</p>
        <p className="text-[11px] text-fg-muted">{task.board.name}</p>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent hover:bg-accent/20 disabled:opacity-50"
      >
        {pending ? "..." : "Add"}
      </button>
      {state?.error && (
        <span className="text-[11px] text-accent-emphasis">{state.error}</span>
      )}
    </form>
  );
}
