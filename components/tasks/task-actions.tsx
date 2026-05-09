"use client";

import { useState } from "react";
import { Link2, Copy, Check, Workflow } from "lucide-react";
import { Tooltip } from "@/components/common/tooltip";
import { DuplicateTaskFormModal } from "./create-task-form";
import type { TaskDefaults } from "./create-task-form";

export interface SourceTask {
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string; // YYYY-MM-DD or ""
  points: number | null;
  assigneeIds: string[];
  tagIds: string[];
  sprintIds: string[];
}

export interface WorkspaceMember {
  id: string;
  name: string | null;
  email: string | null;
  image?: string | null;
}

export interface TagOption {
  id: string;
  name: string;
  color: string | null;
}

export interface SprintOption {
  id: string;
  title: string;
}

export function FlowModeButton({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <Tooltip label={active ? "Close Flow mode" : "Open Flow mode"}>
      <button
        type="button"
        onClick={onToggle}
        aria-label={active ? "Close Flow mode" : "Open Flow mode"}
        className={`cursor-pointer flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
          active
            ? "border-accent bg-accent/10 text-accent"
            : "border-border bg-bg-elevated/60 text-fg-secondary hover:border-accent/40 hover:text-accent"
        }`}
      >
        <Workflow size={14} />
      </button>
    </Tooltip>
  );
}

export function TaskActions({
  taskId,
  workspaceId,
  boardId,
  source,
  members,
  tags,
  sprints,
}: {
  taskId: string;
  workspaceId: string;
  boardId: string;
  source: SourceTask;
  members: WorkspaceMember[];
  tags?: TagOption[];
  sprints?: SprintOption[];
}) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [duplicateOpen, setDuplicateOpen] = useState(false);

  async function handleCopyLink() {
    const url = typeof window !== "undefined" ? `${window.location.origin}/t/${taskId}` : `/t/${taskId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setCopyError(null);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopyError("Couldn't copy — copy from the address bar instead.");
    }
  }

  const defaults: TaskDefaults = {
    title: `${source.title} Copy`,
    description: source.description ?? undefined,
    status: source.status,
    priority: source.priority,
    dueDate: source.dueDate || undefined,
    points: source.points,
    assigneeIds: source.assigneeIds,
    tagIds: source.tagIds,
    sprintId: source.sprintIds[0],
  };

  return (
    <>
      <Tooltip label={copyError ?? (copied ? "Link copied" : "Copy link")}>
        <button
          type="button"
          onClick={handleCopyLink}
          aria-label={copied ? "Link copied" : "Copy link"}
          className="cursor-pointer flex h-8 w-8 items-center justify-center rounded-full border border-border bg-bg-elevated/60 text-fg-secondary transition-colors hover:border-accent/40 hover:text-accent"
        >
          {copied ? <Check size={14} className="text-accent" /> : <Link2 size={14} />}
        </button>
      </Tooltip>

      <Tooltip label="Duplicate task">
        <button
          type="button"
          onClick={() => setDuplicateOpen(true)}
          aria-label="Duplicate task"
          className="cursor-pointer flex h-8 w-8 items-center justify-center rounded-full border border-border bg-bg-elevated/60 text-fg-secondary transition-colors hover:border-accent/40 hover:text-accent"
        >
          <Copy size={14} />
        </button>
      </Tooltip>

      {duplicateOpen && (
        <DuplicateTaskFormModal
          workspaceId={workspaceId}
          boardId={boardId}
          defaults={defaults}
          sprints={sprints}
          members={members}
          tags={tags}
          onClose={() => setDuplicateOpen(false)}
        />
      )}
    </>
  );
}
