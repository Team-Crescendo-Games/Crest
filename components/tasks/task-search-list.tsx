"use client";

import { useSearchParams, usePathname } from "next/navigation";
import { TaskListView } from "./task-list-view";
import type { TaskStatus, TaskPriority } from "@/prisma/generated/prisma/enums";

interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
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

interface Props {
  tasks: Task[];
  workspaceId: string;
  page: number;
  pageSize: number;
  total: number;
}

/**
 * Wraps TaskListView with server-driven URL pagination. Renders all matching
 * tasks (already paginated server-side) under a single "All" pseudo-column so
 * the existing list UI works unchanged.
 */
export function TaskSearchList({ tasks, workspaceId, page, pageSize, total }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const columns = [
    {
      status: "ALL",
      label: "All",
      color: "#9c9c98",
      tasks,
    },
  ];

  function buildHref(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (p <= 1) params.delete("page");
    else params.set("page", String(p));
    const qs = params.toString();
    return `${pathname}${qs ? `?${qs}` : ""}`;
  }

  return (
    <TaskListView
      columns={columns}
      workspaceId={workspaceId}
      pagination={{ mode: "server", page, totalPages, total, pageSize, buildHref }}
    />
  );
}
