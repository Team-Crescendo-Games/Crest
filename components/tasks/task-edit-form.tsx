"use client";

import React, {
  useActionState,
  useState,
  useEffect,
  lazy,
  Suspense,
} from "react";
import { useRouter } from "next/navigation";
import { updateTask, getFlowGraphTasks } from "@/lib/actions/task";
import { TaskActions, FlowModeButton } from "./task-actions";
import { DeleteTaskButton } from "./delete-task-button";
import { DescriptionField } from "./description-field";
import { AssigneeEditor } from "./assignee-editor";
import { TagEditor } from "./tag-editor";
import { TaskEditSidebar } from "./task-edit-sidebar";
import type { TaskStatus, TaskPriority } from "@/prisma/generated/prisma/enums";
import type { TaskFormData } from "@/lib/types/task";

const FlowCanvas = lazy(() =>
  import("@/components/flow-view").then((m) => ({ default: m.FlowCanvas })),
);

type TaskData = TaskFormData;

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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
        router.push(`/w/${workspaceId}/b/${result.newBoardId}/t/${task.id}`);
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
        <div className="min-w-0 space-y-4">
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

          <DescriptionField value={description} onChange={setDescription} />

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
        <TaskEditSidebar
          status={status}
          onStatusChange={setStatus}
          priority={priority}
          onPriorityChange={setPriority}
          dueDate={dueDate}
          onDueDateChange={setDueDate}
          authorId={authorId}
          authorName={authorName}
          authorImage={authorImage}
          memberIdMap={memberIdMap}
          workspaceId={workspaceId}
          selectedBoardId={selectedBoardId}
          onBoardChange={setSelectedBoardId}
          boards={boards}
          sprints={sprints}
          sprintIds={sprintIds}
          onSprintIdsChange={setSprintIds}
        />
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
            <Suspense
              fallback={
                <div className="flex items-center justify-center rounded-md border border-border bg-bg-primary py-16">
                  <p className="font-mono text-sm text-fg-muted animate-pulse">
                    Loading flow view…
                  </p>
                </div>
              }
            >
              <FlowCanvas
                tasks={flowTasks as Parameters<typeof FlowCanvas>[0]["tasks"]}
                rootId={task.id}
                workspaceId={workspaceId}
                onBack={() => setFlowOpen(false)}
              />
            </Suspense>
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
