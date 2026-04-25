"use client";

import Link from "next/link";

interface TimelineTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  startDate: Date | null;
  dueDate: Date | null;
  boardId: string;
  board?: { id: string; name: string };
}

const STATUS_COLORS: Record<string, string> = {
  NOT_STARTED: "#9c9c98",
  IN_PROGRESS: "#f1c258",
  IN_REVIEW: "#f0a468",
  COMPLETED: "#6bc96b",
};

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: "#ef4444",
  HIGH: "#f0a468",
  MEDIUM: "#f1c258",
  LOW: "#6bc96b",
  NONE: "",
};

export function SprintTimeline({
  tasks,
  sprintStart,
  sprintEnd,
  workspaceId,
}: {
  tasks: TimelineTask[];
  sprintStart: Date;
  sprintEnd: Date;
  workspaceId: string;
}) {
  const start = new Date(sprintStart);
  start.setHours(0, 0, 0, 0);
  const end = new Date(sprintEnd);
  end.setHours(23, 59, 59, 999);

  const totalDays = Math.max(
    1,
    Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayOffset = Math.max(
    0,
    Math.min(
      totalDays,
      (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    ),
  );

  // Generate day labels
  const days: {
    date: Date;
    label: string;
    isToday: boolean;
    isWeekend: boolean;
  }[] = [];
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const dayOfWeek = d.getDay();
    days.push({
      date: d,
      label: d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      isToday:
        d.getFullYear() === today.getFullYear() &&
        d.getMonth() === today.getMonth() &&
        d.getDate() === today.getDate(),
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    });
  }

  const DAY_WIDTH = 48; // px per day

  // Sort tasks: those with start dates first, then by due date
  const sortedTasks = [...tasks].sort((a, b) => {
    const aStart = a.startDate
      ? new Date(a.startDate).getTime()
      : a.dueDate
        ? new Date(a.dueDate).getTime()
        : Infinity;
    const bStart = b.startDate
      ? new Date(b.startDate).getTime()
      : b.dueDate
        ? new Date(b.dueDate).getTime()
        : Infinity;
    return aStart - bStart;
  });

  function getTaskPosition(task: TimelineTask) {
    const taskDue = task.dueDate ? new Date(task.dueDate) : null;
    const taskStart = task.startDate ? new Date(task.startDate) : null;

    if (!taskDue) return null; // No due date, can't place on timeline

    if (taskStart) {
      // Range block
      const startOffset = Math.max(
        0,
        (taskStart.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
      );
      const endOffset = Math.min(
        totalDays,
        (taskDue.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) + 1,
      );
      return {
        left: startOffset * DAY_WIDTH,
        width: Math.max(DAY_WIDTH * 0.5, (endOffset - startOffset) * DAY_WIDTH),
        isMarker: false,
      };
    } else {
      // Single marker on due date
      const offset =
        (taskDue.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      return {
        left: offset * DAY_WIDTH,
        width: DAY_WIDTH * 0.6,
        isMarker: true,
      };
    }
  }

  return (
    <div className="rounded-md border border-border bg-bg-elevated/60 backdrop-blur-sm">
      <div className="overflow-x-auto">
        <div style={{ minWidth: totalDays * DAY_WIDTH + 200 }}>
          {/* Header row — day labels */}
          <div className="flex border-b border-border">
            {/* Task name column */}
            <div className="w-[200px] shrink-0 border-r border-border px-3 py-2">
              <span className="text-[11px] font-medium text-fg-muted">
                Task
              </span>
            </div>
            {/* Day columns */}
            <div className="relative flex">
              {days.map((day, i) => (
                <div
                  key={i}
                  className={`flex shrink-0 items-center justify-center border-r border-border-subtle py-2 ${
                    day.isToday
                      ? "bg-accent/5"
                      : day.isWeekend
                        ? "bg-bg-secondary/30"
                        : ""
                  }`}
                  style={{ width: DAY_WIDTH }}
                >
                  <span
                    className={`text-[10px] ${
                      day.isToday ? "font-medium text-accent" : "text-fg-muted"
                    }`}
                  >
                    {day.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Task rows */}
          {sortedTasks.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-fg-muted">
              No tasks with due dates to display on the timeline.
            </div>
          ) : (
            sortedTasks.map((task) => {
              const pos = getTaskPosition(task);
              const boardId = task.board?.id ?? task.boardId;

              return (
                <div
                  key={task.id}
                  className="flex border-b border-border-subtle last:border-b-0"
                >
                  {/* Task name */}
                  <div className="w-[200px] shrink-0 border-r border-border px-3 py-2">
                    <Link
                      href={`/dashboard/workspaces/${workspaceId}/boards/${boardId}/tasks/${task.id}`}
                      className="block truncate font-mono text-xs text-fg-primary hover:text-accent"
                    >
                      {task.title}
                    </Link>
                    {task.board && (
                      <span className="text-[10px] text-fg-muted">
                        {task.board.name}
                      </span>
                    )}
                  </div>

                  {/* Timeline area */}
                  <div
                    className="relative"
                    style={{ width: totalDays * DAY_WIDTH, height: 36 }}
                  >
                    {/* Today marker */}
                    {todayOffset >= 0 && todayOffset <= totalDays && (
                      <div
                        className="absolute top-0 h-full w-px bg-accent/30"
                        style={{ left: todayOffset * DAY_WIDTH }}
                      />
                    )}

                    {/* Task block */}
                    {pos && (
                      <div
                        className="absolute top-1.5 flex items-center rounded-sm px-1"
                        style={{
                          left: pos.left,
                          width: pos.width,
                          height: 22,
                          backgroundColor: STATUS_COLORS[task.status] + "25",
                          borderLeft: `2px solid ${STATUS_COLORS[task.status]}`,
                        }}
                      >
                        {task.priority !== "NONE" && (
                          <div
                            className="mr-1 h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{
                              backgroundColor: PRIORITY_COLORS[task.priority],
                            }}
                          />
                        )}
                        <span
                          className="truncate text-[10px] font-medium"
                          style={{ color: STATUS_COLORS[task.status] }}
                        >
                          {task.title}
                        </span>
                      </div>
                    )}

                    {!pos && (
                      <div className="flex h-full items-center px-2">
                        <span className="text-[10px] text-fg-muted italic">
                          No dates
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
