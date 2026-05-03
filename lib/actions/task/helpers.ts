import { prisma } from "@/lib/prisma";
import {
  TaskStatus,
  TaskPriority,
  ActivityType,
} from "@/prisma/generated/prisma/enums";
import type { SortOption } from "@/lib/task-enums";

export const VALID_STATUSES: TaskStatus[] = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "IN_REVIEW",
  "COMPLETED",
];

export const VALID_PRIORITIES: TaskPriority[] = [
  "NONE",
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
];

export async function requireTaskMembership(userId: string, taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { board: { select: { workspaceId: true, id: true } } },
  });
  if (!task) throw new Error("Task not found");

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId: task.board.workspaceId,
      },
    },
  });
  if (!membership) throw new Error("Not a member");

  return { task, workspaceId: task.board.workspaceId };
}

export async function logActivity(
  taskId: string,
  userId: string,
  type: ActivityType,
  opts?: {
    field?: string;
    oldValue?: string | null;
    newValue?: string | null;
  },
) {
  await prisma.activity.create({
    data: {
      taskId,
      userId,
      type,
      field: opts?.field ?? null,
      oldValue: opts?.oldValue ?? null,
      newValue: opts?.newValue ?? null,
    },
  });
}

/** Build a Prisma-compatible orderBy array from SortOption[]. */
export function buildOrderBy(
  sorts?: SortOption[],
): Record<string, string>[] {
  if (!sorts || sorts.length === 0) return [{ createdAt: "desc" }];
  const orderBy: Record<string, string>[] = sorts.map((s) => ({
    [s.field]: s.direction,
  }));
  // Always add createdAt as a tiebreaker
  orderBy.push({ createdAt: "desc" });
  return orderBy;
}
