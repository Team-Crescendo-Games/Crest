/**
 * Shared labels and colors for task status and priority enums.
 *
 * The Prisma enums are the source of truth for the values. This module
 * adds display metadata (human label + color) that the UI needs.
 */

import type { TaskStatus, TaskPriority } from "@/prisma/generated/prisma/enums";

export const TASK_STATUSES: readonly TaskStatus[] = ["NOT_STARTED", "IN_PROGRESS", "IN_REVIEW", "COMPLETED"] as const;

export const TASK_PRIORITIES: readonly TaskPriority[] = ["NONE", "LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export const STATUS_LABELS: Record<TaskStatus, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  COMPLETED: "Completed",
};

export const STATUS_COLORS: Record<TaskStatus, string> = {
  NOT_STARTED: "#9c9c98",
  IN_PROGRESS: "#f1c258",
  IN_REVIEW: "#f0a468",
  COMPLETED: "#6bc96b",
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  NONE: "None",
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  NONE: "#9c9c98",
  LOW: "#a1a1aa",
  MEDIUM: "#7b93b0",
  HIGH: "#f0a468",
  URGENT: "#ef4444",
};

/* ─── Sort options ─────────────────────────────────────────────────────── */

export type SortField = "dueDate" | "startDate" | "priority" | "points";
export type SortDirection = "asc" | "desc";

export interface SortOption {
  field: SortField;
  direction: SortDirection;
}

export const SORT_FIELD_LABELS: Record<SortField, string> = {
  dueDate: "Due Date",
  startDate: "Start Date",
  priority: "Priority",
  points: "Points",
};

export const SORT_DIRECTION_LABELS: Record<SortDirection, string> = {
  asc: "Ascending",
  desc: "Descending",
};

/** Priority ordering for custom sort (higher priority = lower number for desc). */
export const PRIORITY_ORDER: Record<TaskPriority, number> = {
  URGENT: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  NONE: 4,
};

/**
 * Serialize sort options into a URL-friendly string.
 * Format: "field:dir,field:dir" e.g. "priority:desc,dueDate:asc"
 */
export function serializeSorts(sorts: SortOption[]): string {
  return sorts.map((s) => `${s.field}:${s.direction}`).join(",");
}

/**
 * Parse a sort string from URL params into SortOption[].
 */
export function parseSorts(value: string | undefined): SortOption[] {
  if (!value) return [];
  return value
    .split(",")
    .map((part) => {
      const [field, direction] = part.split(":");
      if (field && direction && field in SORT_FIELD_LABELS && (direction === "asc" || direction === "desc")) {
        return { field: field as SortField, direction: direction as SortDirection };
      }
      return null;
    })
    .filter((s): s is SortOption => s !== null);
}
