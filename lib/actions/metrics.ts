"use server";

import { prisma } from "@/lib/prisma";

/**
 * Returns weekly completed task-points for a user.
 *
 * A task counts toward a week if:
 *   1. It is currently COMPLETED
 *   2. It has an Activity with type STATUS_CHANGED, newValue "COMPLETED",
 *      and createdAt falls within that week
 *   3. It is assigned to the given user
 *
 * Each qualifying task contributes its `points` value (defaulting to 0).
 * Weeks are returned in chronological order (oldest first).
 */
export async function getWeeklyCompletedPoints(
  userId: string,
  weeks: number = 8,
): Promise<{ weekLabel: string; weekStart: string; points: number }[]> {
  const now = new Date();
  // Start of the current week (Monday)
  const currentWeekStart = new Date(now);
  const day = currentWeekStart.getDay();
  const diff = day === 0 ? 6 : day - 1; // Monday = 0 offset
  currentWeekStart.setDate(currentWeekStart.getDate() - diff);
  currentWeekStart.setHours(0, 0, 0, 0);

  // Earliest date we care about
  const periodStart = new Date(currentWeekStart);
  periodStart.setDate(periodStart.getDate() - (weeks - 1) * 7);

  // Find all STATUS_CHANGED → COMPLETED activities for this user's assigned tasks
  // within the evaluation period
  const activities = await prisma.activity.findMany({
    where: {
      type: "STATUS_CHANGED",
      newValue: "COMPLETED",
      createdAt: { gte: periodStart },
      task: {
        status: "COMPLETED",
        assignees: { some: { id: userId } },
      },
    },
    select: {
      createdAt: true,
      taskId: true,
      task: { select: { points: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Deduplicate: if a task was completed multiple times (reopened then closed),
  // use the latest completion within the period.
  const latestByTask = new Map<string, { createdAt: Date; points: number }>();
  for (const a of activities) {
    latestByTask.set(a.taskId, {
      createdAt: a.createdAt,
      points: a.task.points ?? 0,
    });
  }

  // Build week buckets
  const buckets: { weekLabel: string; weekStart: string; points: number }[] = [];
  for (let i = 0; i < weeks; i++) {
    const ws = new Date(periodStart);
    ws.setDate(ws.getDate() + i * 7);
    const we = new Date(ws);
    we.setDate(we.getDate() + 7);

    let points = 0;
    for (const entry of latestByTask.values()) {
      if (entry.createdAt >= ws && entry.createdAt < we) {
        points += entry.points;
      }
    }

    const month = ws.toLocaleString("en-US", { month: "short" });
    const dayNum = ws.getDate();
    buckets.push({
      weekLabel: `${month} ${dayNum}`,
      weekStart: ws.toISOString(),
      points,
    });
  }

  return buckets;
}

/**
 * Returns tag distribution for all tasks assigned to a user.
 *
 * Each task-tag pair adds 1 point to that tag. The result includes
 * the tag name, color, count, and percentage of total.
 */
export async function getTasksByTag(
  userId: string,
): Promise<{ name: string; color: string; count: number; percent: number }[]> {
  // Get all tasks assigned to this user that have at least one tag
  const tasks = await prisma.task.findMany({
    where: {
      assignees: { some: { id: userId } },
      tags: { some: {} },
    },
    select: {
      tags: { select: { name: true, color: true } },
    },
  });

  // Accumulate counts per tag
  const tagMap = new Map<string, { color: string; count: number }>();
  let total = 0;

  for (const task of tasks) {
    for (const tag of task.tags) {
      const existing = tagMap.get(tag.name);
      if (existing) {
        existing.count += 1;
      } else {
        tagMap.set(tag.name, { color: tag.color ?? "#6B7280", count: 1 });
      }
      total += 1;
    }
  }

  // Convert to sorted array with percentages
  const result = Array.from(tagMap.entries())
    .map(([name, { color, count }]) => ({
      name,
      color,
      count,
      percent: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return result;
}
