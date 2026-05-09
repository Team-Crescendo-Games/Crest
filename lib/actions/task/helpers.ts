import { prisma } from "@/lib/prisma";
import { TaskStatus, TaskPriority, ActivityType } from "@/prisma/generated/prisma/enums";
import type { SortOption } from "@/lib/task-enums";

export const VALID_STATUSES: TaskStatus[] = ["NOT_STARTED", "IN_PROGRESS", "IN_REVIEW", "COMPLETED"];

export const VALID_PRIORITIES: TaskPriority[] = ["NONE", "LOW", "MEDIUM", "HIGH", "URGENT"];

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

// ─── Activity pruning ──────────────────────────────────────────────────────
// When the same user repeatedly changes the same field within a short window,
// collapse the chain into a single entry so the timeline stays useful.

const PRUNE_WINDOW_MS = 5 * 60 * 1000;

const VALUE_EDIT_FIELDS = new Set([
  "title",
  "description",
  "dueDate",
  "startDate",
  "points",
  "board",
]);

/** Value-changing activities: collapse chain, preserving oldest oldValue. */
function isValueChange(type: ActivityType, field: string | null): boolean {
  if (type === "STATUS_CHANGED" || type === "PRIORITY_CHANGED") return true;
  if (type === "EDITED" && field && VALUE_EDIT_FIELDS.has(field)) return true;
  return false;
}

/** Reference-bearing activities: only collapse exact duplicates. */
function isReferenceChange(type: ActivityType, field: string | null): boolean {
  if (
    type === "ASSIGNED" ||
    type === "UNASSIGNED" ||
    type === "MOVED_TO_SPRINT" ||
    type === "REMOVED_FROM_SPRINT"
  ) {
    return true;
  }
  if (type === "EDITED" && (field === "tag_added" || field === "tag_removed")) {
    return true;
  }
  return false;
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
  const field = opts?.field ?? null;
  const oldValue = opts?.oldValue ?? null;
  const newValue = opts?.newValue ?? null;

  const created = await prisma.activity.create({
    data: { taskId, userId, type, field, oldValue, newValue },
  });

  const since = new Date(created.createdAt.getTime() - PRUNE_WINDOW_MS);

  if (isValueChange(type, field)) {
    // Find all same-user/same-type/same-field activities in the window
    // (excluding the one we just created), then collapse them into the new entry.
    const earlier = await prisma.activity.findMany({
      where: {
        taskId,
        userId,
        type,
        field,
        id: { not: created.id },
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "asc" },
      select: { id: true, oldValue: true },
    });

    if (earlier.length > 0) {
      // Inherit the oldest oldValue so the surviving entry spans the whole chain.
      await prisma.activity.update({
        where: { id: created.id },
        data: { oldValue: earlier[0].oldValue },
      });
      await prisma.activity.deleteMany({
        where: { id: { in: earlier.map((e) => e.id) } },
      });
    }
  } else if (isReferenceChange(type, field)) {
    // Only collapse exact-duplicate references (same entity).
    const dupes = await prisma.activity.findMany({
      where: {
        taskId,
        userId,
        type,
        field,
        oldValue,
        newValue,
        id: { not: created.id },
        createdAt: { gte: since },
      },
      select: { id: true },
    });

    if (dupes.length > 0) {
      await prisma.activity.deleteMany({
        where: { id: { in: dupes.map((d) => d.id) } },
      });
    }
  }
}

export function buildOrderBy(sorts?: SortOption[]): Record<string, string>[] {
  if (!sorts || sorts.length === 0) return [{ createdAt: "desc" }];
  const orderBy: Record<string, string>[] = sorts.map((s) => ({
    [s.field]: s.direction,
  }));
  // Always add createdAt as a tiebreaker
  orderBy.push({ createdAt: "desc" });
  return orderBy;
}
