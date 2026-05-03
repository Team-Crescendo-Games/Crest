"use client";

import React from "react";
import Link from "next/link";
import { X, Calendar } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { DropdownPicker, BoardField } from "./dropdown-picker";
import { SprintEditor } from "./sprint-editor";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  TASK_STATUSES,
  TASK_PRIORITIES,
} from "@/lib/task-enums";
import type { TaskStatus, TaskPriority } from "@/prisma/generated/prisma/enums";

export interface TaskEditSidebarProps {
  status: TaskStatus;
  onStatusChange: (v: TaskStatus) => void;
  priority: TaskPriority;
  onPriorityChange: (v: TaskPriority) => void;
  dueDate: string;
  onDueDateChange: (v: string) => void;
  authorId: string;
  authorName: string | null;
  authorImage: string | null;
  memberIdMap: Record<string, string>;
  workspaceId: string;
  selectedBoardId: string;
  onBoardChange: (v: string) => void;
  boards: { id: string; name: string }[];
  sprints: { id: string; title: string }[];
  sprintIds: string[];
  onSprintIdsChange: (ids: string[]) => void;
}

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

export function TaskEditSidebar({
  status,
  onStatusChange,
  priority,
  onPriorityChange,
  dueDate,
  onDueDateChange,
  authorId,
  authorName,
  authorImage,
  memberIdMap,
  workspaceId,
  selectedBoardId,
  onBoardChange,
  boards,
  sprints,
  sprintIds,
  onSprintIdsChange,
}: TaskEditSidebarProps) {
  return (
    <div className="space-y-4">
      <SidebarBlock label="Status">
        <DropdownPicker
          value={status}
          onChange={(v) => onStatusChange(v as TaskStatus)}
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
          onChange={(v) => onPriorityChange(v as TaskPriority)}
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
            onChange={(e) => onDueDateChange(e.target.value)}
            className="w-full rounded border border-border bg-bg-primary px-1.5 py-1 font-mono text-[11px] text-fg-primary focus:border-accent focus:outline-none"
          />
          {dueDate && (
            <button
              type="button"
              onClick={() => onDueDateChange("")}
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
            href={`/w/${workspaceId}/team/${memberIdMap[authorId]}`}
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
          onChange={onBoardChange}
          options={boards.map((b) => ({ value: b.id, label: b.name }))}
          href={`/w/${workspaceId}/b/${selectedBoardId}`}
        />
      </SidebarBlock>

      <SidebarBlock label="Sprints">
        <SprintEditor
          sprints={sprints}
          selectedIds={sprintIds}
          onChange={onSprintIdsChange}
          workspaceId={workspaceId}
        />
      </SidebarBlock>
    </div>
  );
}
