/**
 * Shared labels and colors for task status and priority enums.
 *
 * The Prisma enums are the source of truth for the values. This module
 * adds display metadata (human label + color) that the UI needs.
 */

import type {
  TaskStatus,
  TaskPriority,
} from "@/prisma/generated/prisma/enums";

export const TASK_STATUSES: readonly TaskStatus[] = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "IN_REVIEW",
  "COMPLETED",
] as const;

export const TASK_PRIORITIES: readonly TaskPriority[] = [
  "NONE",
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
] as const;

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
  LOW: "#6bc96b",
  MEDIUM: "#f1c258",
  HIGH: "#f0a468",
  URGENT: "#ef4444",
};
