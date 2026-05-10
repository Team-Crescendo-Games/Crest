"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { UserAvatar } from "@/components/common/user-avatar";
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS } from "@/lib/task-enums";
import type { TaskStatus, TaskPriority } from "@/prisma/generated/prisma/enums";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 20;

type ServerPagination = {
  mode: "server";
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  buildHref: (page: number) => string;
};

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: Date | null;
  points?: number | null;
  assignees: { id: string; name: string | null; image?: string | null }[];
  tags?: { name: string; color: string | null }[];
  board?: { id: string; name: string };
  boardId?: string;
  workspaceId?: string;
  commentCount?: number;
  subtaskTotal?: number;
  subtaskCompleted?: number;
}

interface Column {
  status: string;
  label: string;
  color: string;
  tasks: Task[];
}

export function TaskListView({
  columns,
  workspaceId,
  boardId,
  pagination,
}: {
  columns: Column[];
  workspaceId: string;
  boardId?: string;
  pagination?: ServerPagination;
}) {
  const allTasks = useMemo(() => columns.flatMap((col) => col.tasks), [columns]);
  const [page, setPage] = useState(1);

  const isServer = pagination?.mode === "server";
  const totalPages = isServer ? pagination.totalPages : Math.max(1, Math.ceil(allTasks.length / PAGE_SIZE));
  const currentPage = isServer ? pagination.page : Math.min(page, totalPages);
  const pageSize = isServer ? pagination.pageSize : PAGE_SIZE;
  const totalCount = isServer ? pagination.total : allTasks.length;
  const pageTasks = isServer ? allTasks : allTasks.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (totalCount === 0) {
    return <p className="py-8 text-center text-xs text-fg-muted">No tasks found.</p>;
  }

  /** Build page numbers with ellipsis for large page counts. */
  function pageNumbers(): (number | "ellipsis")[] {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | "ellipsis")[] = [1];
    if (currentPage > 3) pages.push("ellipsis");
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push("ellipsis");
    pages.push(totalPages);
    return pages;
  }

  const renderPageControl = (opts: {
    p: number;
    children: React.ReactNode;
    disabled?: boolean;
    isCurrent?: boolean;
    ariaLabel?: string;
    extraClass?: string;
    key?: string | number;
  }) => {
    const baseClass = opts.isCurrent
      ? "bg-accent/15 text-accent"
      : "text-fg-muted hover:bg-bg-secondary hover:text-fg-secondary";
    const className = `min-w-[22px] cursor-pointer rounded px-1 py-0.5 text-[11px] font-medium transition-colors ${baseClass} ${opts.extraClass ?? ""}`;
    if (pagination?.mode === "server") {
      if (opts.disabled) {
        return (
          <span
            key={opts.key}
            className={`${className} cursor-not-allowed opacity-30`}
            aria-label={opts.ariaLabel}
          >
            {opts.children}
          </span>
        );
      }
      return (
        <Link key={opts.key} href={pagination.buildHref(opts.p)} className={className} aria-label={opts.ariaLabel}>
          {opts.children}
        </Link>
      );
    }
    return (
      <button
        key={opts.key}
        onClick={() => setPage(opts.p)}
        disabled={opts.disabled}
        className={`${className} ${opts.disabled ? "disabled:opacity-30 disabled:cursor-not-allowed" : ""}`}
        aria-label={opts.ariaLabel}
      >
        {opts.children}
      </button>
    );
  };

  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalCount);

  const paginationEl =
    totalPages > 1 ? (
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-fg-muted">
          {startIndex}–{endIndex} of {totalCount} tasks
        </p>
        <div className="flex items-center gap-1">
          {renderPageControl({
            p: Math.max(1, currentPage - 1),
            disabled: currentPage === 1,
            ariaLabel: "Previous page",
            extraClass: "!p-1",
            children: <ChevronLeft size={13} />,
          })}

          {pageNumbers().map((p, i) =>
            p === "ellipsis" ? (
              <span key={`ellipsis-${i}`} className="px-0.5 text-[10px] text-fg-muted">
                …
              </span>
            ) : (
              renderPageControl({
                key: p,
                p,
                isCurrent: p === currentPage,
                children: p,
              })
            ),
          )}

          {renderPageControl({
            p: Math.min(totalPages, currentPage + 1),
            disabled: currentPage === totalPages,
            ariaLabel: "Next page",
            extraClass: "!p-1",
            children: <ChevronRight size={13} />,
          })}
        </div>
      </div>
    ) : null;

  return (
    <div>
      {/* Top pagination */}
      {paginationEl && <div className="mb-3">{paginationEl}</div>}

      <div className="overflow-hidden rounded-md border border-border">
        {/* Header */}
        <div className="grid grid-cols-[1fr_100px_90px_90px_80px_60px] gap-2 border-b border-border bg-bg-secondary/50 px-4 py-2 text-[10px] font-medium uppercase tracking-wider text-fg-muted">
          <span>Task</span>
          <span>Status</span>
          <span>Priority</span>
          <span>Assignees</span>
          <span>Due</span>
          <span className="text-right">Pts</span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-border-subtle">
          {pageTasks.map((task) => {
            const taskBoardId = boardId ?? task.boardId ?? task.board?.id ?? "";
            return (
              <Link
                key={task.id}
                href={`/w/${workspaceId}/b/${taskBoardId}/t/${task.id}`}
                className="group grid grid-cols-[1fr_100px_90px_90px_80px_60px] items-center gap-2 px-4 py-2.5 transition-colors hover:bg-bg-secondary/50"
              >
                {/* Title + tags */}
                <div className="min-w-0">
                  <p className="truncate font-mono text-[11px] font-medium text-fg-primary transition-colors group-hover:text-accent">
                    {task.title}
                  </p>
                  {task.tags && task.tags.length > 0 && (
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {task.tags.map((tag) => (
                        <span
                          key={tag.name}
                          className="rounded-full px-1.5 py-px text-[9px] font-medium"
                          style={{
                            color: tag.color ?? "#6B7280",
                            backgroundColor: (tag.color ?? "#6B7280") + "18",
                          }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Status */}
                <div>
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={{
                      color: STATUS_COLORS[task.status as TaskStatus],
                      backgroundColor: STATUS_COLORS[task.status as TaskStatus] + "18",
                    }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{
                        backgroundColor: STATUS_COLORS[task.status as TaskStatus],
                      }}
                    />
                    {STATUS_LABELS[task.status as TaskStatus]}
                  </span>
                </div>

                {/* Priority */}
                <div>
                  <span
                    className="text-[10px] font-medium"
                    style={{
                      color: PRIORITY_COLORS[task.priority as TaskPriority],
                    }}
                  >
                    {PRIORITY_LABELS[task.priority as TaskPriority]}
                  </span>
                </div>

                {/* Assignees */}
                <div className="flex -space-x-1">
                  {task.assignees.slice(0, 3).map((a) => (
                    <UserAvatar key={a.id} name={a.name} image={a.image} size={18} />
                  ))}
                  {task.assignees.length > 3 && (
                    <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-bg-secondary text-[8px] font-medium text-fg-muted ring-1 ring-bg-primary">
                      +{task.assignees.length - 3}
                    </span>
                  )}
                  {task.assignees.length === 0 && <span className="text-[10px] text-fg-muted">—</span>}
                </div>

                {/* Due date */}
                <div>
                  {task.dueDate ? (
                    <span className="flex items-center gap-1 text-[10px] text-fg-muted">
                      <Calendar size={9} />
                      {new Date(task.dueDate).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  ) : (
                    <span className="text-[10px] text-fg-muted">—</span>
                  )}
                </div>

                {/* Points */}
                <div className="text-right">
                  {task.points != null ? (
                    <span className="text-[10px] font-medium text-fg-secondary">{task.points}</span>
                  ) : (
                    <span className="text-[10px] text-fg-muted">—</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Bottom pagination */}
      {paginationEl && <div className="mt-3">{paginationEl}</div>}
    </div>
  );
}
