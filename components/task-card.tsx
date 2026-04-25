"use client";

import Link from "next/link";
import { UserAvatar } from "@/components/user-avatar";
import { PRIORITY_COLORS } from "@/lib/task-enums";
import type { TaskPriority } from "@/prisma/generated/prisma/enums";

export interface TaskCardData {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  dueDate?: Date | null;
  points?: number | null;
  assignees: { id: string; name: string | null; image?: string | null }[];
  tags?: { name: string; color: string | null }[];
  board?: { id: string; name: string; workspaceId?: string };
  boardId?: string;
  workspaceId?: string;
  commentCount?: number;
}

/**
 * Simple: priority, title, description (1 line), tags, assignee avatars, due date.
 * Detailed: above + points.
 */
export function TaskCard({
  task,
  variant = "simple",
  workspaceId,
  href,
  className = "",
}: {
  task: TaskCardData;
  variant?: "simple" | "detailed";
  workspaceId: string;
  href?: string;
  className?: string;
}) {
  const resolvedWorkspaceId = task.workspaceId || task.board?.workspaceId || workspaceId;
  const link =
    href ??
    `/dashboard/workspaces/${resolvedWorkspaceId}/boards/${task.board?.id ?? task.boardId}/tasks/${task.id}`;

  return (
    <Link
      href={link}
      className={`group relative block overflow-hidden rounded-md border border-border bg-bg-elevated/60 p-3 pl-4 backdrop-blur-sm transition-all duration-150 ease-out hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-md hover:shadow-accent/5 ${className}`}
    >
      {/* Left priority bar (omitted when priority is NONE) */}
      {task.priority !== "NONE" && (
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-1"
          style={{
            backgroundColor:
              PRIORITY_COLORS[task.priority as TaskPriority] ?? "transparent",
          }}
        />
      )}

      {/* Comment indicator — top-right orange triangle */}
      {(task.commentCount ?? 0) > 0 && (
        <span
          aria-hidden
          className="absolute right-0 top-0 h-0 w-0"
          style={{
            borderTop: "12px solid var(--accent-emphasis, #f0a468)",
            borderLeft: "12px solid transparent",
          }}
        />
      )}

      {/* Row 1: title */}
      <p className="font-mono text-xs font-medium text-fg-primary line-clamp-2">
        {task.title}
      </p>

      {/* Row 2: description (1 line) */}
      {task.description && (
        <p className="mt-1 text-[11px] text-fg-muted line-clamp-1">
          {task.description}
        </p>
      )}

      {/* Row 3: tags (always shown) + points (detailed only) */}
      {((task.tags && task.tags.length > 0) ||
        (variant === "detailed" && task.points != null)) && (
        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
          {variant === "detailed" && task.points != null && (
            <span className="rounded bg-bg-secondary px-1 py-px text-[10px] font-mono text-fg-muted">
              {task.points}pt
            </span>
          )}
          {task.tags?.map((tag) => (
            <span
              key={tag.name}
              className="rounded px-1 py-px text-[9px]"
              style={{
                backgroundColor: (tag.color ?? "#6B7280") + "15",
                color: tag.color ?? "#6B7280",
              }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {/* Row 4: assignee avatars + due date */}
      <div className="mt-1.5 flex items-center justify-between">
        {task.assignees.length > 0 ? (
          <div className="flex -space-x-1">
            {task.assignees.slice(0, 4).map((a) => (
              <UserAvatar
                key={a.id}
                name={a.name}
                image={a.image}
                size={20}
                className="ring-1 ring-bg-elevated"
              />
            ))}
            {task.assignees.length > 4 && (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-bg-secondary text-[8px] font-medium text-fg-muted ring-1 ring-bg-elevated">
                +{task.assignees.length - 4}
              </div>
            )}
          </div>
        ) : (
          <div />
        )}
        {task.dueDate && (
          <span className="text-[11px] text-fg-muted">
            {new Date(task.dueDate).toLocaleDateString()}
          </span>
        )}
      </div>
    </Link>
  );
}
