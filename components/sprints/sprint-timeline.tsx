"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
import { STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, TASK_STATUSES } from "@/lib/task-enums";
import { updateTaskDates } from "@/lib/actions/task";
import type { TaskStatus, TaskPriority } from "@/prisma/generated/prisma/enums";

interface TimelineTask {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  startDate: Date | null;
  dueDate: Date | null;
  createdAt: Date;
  boardId: string;
  board?: { id: string; name: string };
}

const TASK_COL = 232;
const ROW_H = 36;
const GROUP_H = 30;
const DAY_MS = 1000 * 60 * 60 * 24;

type Zoom = "day" | "week";

export function SprintTimeline({
  tasks,
  sprintStart,
  sprintEnd,
  workspaceId,
  canEdit = false,
}: {
  tasks: TimelineTask[];
  sprintStart: Date;
  sprintEnd: Date;
  workspaceId: string;
  canEdit?: boolean;
}) {
  const router = useRouter();
  const sprintStartDay = useMemo(() => {
    const d = new Date(sprintStart);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [sprintStart]);
  const sprintEndDay = useMemo(() => {
    const d = new Date(sprintEnd);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [sprintEnd]);

  // Extend the visible range to include any task start/due dates that fall outside the sprint.
  const { start, totalDays, sprintStartOffset, sprintEndOffset } = useMemo(() => {
    let minMs = sprintStartDay.getTime();
    let maxMs = sprintEndDay.getTime();
    for (const t of tasks) {
      const effectiveStart = t.startDate ?? t.createdAt;
      if (effectiveStart) {
        const d = new Date(effectiveStart);
        d.setHours(0, 0, 0, 0);
        const ms = d.getTime();
        if (ms < minMs) minMs = ms;
        if (ms > maxMs) maxMs = ms;
      }
      if (t.dueDate) {
        const d = new Date(t.dueDate);
        d.setHours(0, 0, 0, 0);
        const ms = d.getTime();
        if (ms < minMs) minMs = ms;
        if (ms > maxMs) maxMs = ms;
      }
    }
    // Pad with a couple of days for breathing room when the range was extended.
    const extendedBefore = minMs < sprintStartDay.getTime();
    const extendedAfter = maxMs > sprintEndDay.getTime();
    if (extendedBefore) minMs -= 2 * DAY_MS;
    if (extendedAfter) maxMs += 2 * DAY_MS;

    const startDate = new Date(minMs);
    startDate.setHours(0, 0, 0, 0);
    const total = Math.max(1, Math.round((maxMs - minMs) / DAY_MS) + 1);
    const sStart = Math.round((sprintStartDay.getTime() - startDate.getTime()) / DAY_MS);
    const sEnd = Math.round((sprintEndDay.getTime() - startDate.getTime()) / DAY_MS) + 1;
    return { start: startDate, totalDays: total, sprintStartOffset: sStart, sprintEndOffset: sEnd };
  }, [sprintStartDay, sprintEndDay, tasks]);

  const [zoom, setZoom] = useState<Zoom>(() => (totalDays <= 14 ? "day" : "week"));
  const dayWidth = zoom === "day" ? 44 : 16;
  const totalWidth = totalDays * dayWidth;

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const todayDayOffset = (today.getTime() - start.getTime()) / DAY_MS;
  const todayInRange = todayDayOffset >= 0 && todayDayOffset <= totalDays;

  const days = useMemo(() => {
    const arr: { date: Date; isToday: boolean; isWeekend: boolean; outOfSprint: boolean }[] = [];
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const dow = d.getDay();
      arr.push({
        date: d,
        isToday:
          d.getFullYear() === today.getFullYear() &&
          d.getMonth() === today.getMonth() &&
          d.getDate() === today.getDate(),
        isWeekend: dow === 0 || dow === 6,
        outOfSprint: i < sprintStartOffset || i >= sprintEndOffset,
      });
    }
    return arr;
  }, [start, totalDays, today, sprintStartOffset, sprintEndOffset]);

  const monthBands = useMemo(() => {
    const bands: { label: string; left: number; width: number }[] = [];
    if (days.length === 0) return bands;
    let cur = 0;
    let curMonth = days[0].date.getMonth();
    let curYear = days[0].date.getFullYear();
    for (let i = 1; i <= days.length; i++) {
      const d = days[i];
      const isBoundary = !d || d.date.getMonth() !== curMonth || d.date.getFullYear() !== curYear;
      if (isBoundary) {
        const startD = days[cur].date;
        bands.push({
          label: startD.toLocaleDateString(undefined, { month: "short", year: "numeric" }),
          left: cur * dayWidth,
          width: (i - cur) * dayWidth,
        });
        if (d) {
          cur = i;
          curMonth = d.date.getMonth();
          curYear = d.date.getFullYear();
        }
      }
    }
    return bands;
  }, [days, dayWidth]);

  const weekBands = useMemo(() => {
    if (zoom !== "week") return [];
    const bands: { label: string; left: number; width: number; isCurrent: boolean; outOfSprint: boolean }[] = [];
    for (let i = 0; i < days.length; i += 7) {
      const span = Math.min(7, days.length - i);
      const isCurrent = todayInRange && todayDayOffset >= i && todayDayOffset < i + span;
      // Out-of-sprint if every day in this band is outside the sprint range.
      let outOfSprint = true;
      for (let k = i; k < i + span; k++) {
        if (!days[k].outOfSprint) {
          outOfSprint = false;
          break;
        }
      }
      bands.push({
        label: days[i].date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        left: i * dayWidth,
        width: span * dayWidth,
        isCurrent,
        outOfSprint,
      });
    }
    return bands;
  }, [days, dayWidth, zoom, todayInRange, todayDayOffset]);

  type Group = { key: string; label: string; color: string; tasks: TimelineTask[] };
  const groups: Group[] = useMemo(() => {
    const byStatus: Record<TaskStatus, TimelineTask[]> = {
      NOT_STARTED: [],
      IN_PROGRESS: [],
      IN_REVIEW: [],
      COMPLETED: [],
    };
    const unscheduled: TimelineTask[] = [];
    for (const t of tasks) {
      if (!t.dueDate) unscheduled.push(t);
      else byStatus[t.status].push(t);
    }
    const sortFn = (a: TimelineTask, b: TimelineTask) => {
      const aS = a.startDate ?? a.createdAt;
      const bS = b.startDate ?? b.createdAt;
      const aT = aS ? new Date(aS).getTime() : a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const bT = bS ? new Date(bS).getTime() : b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return aT - bT;
    };
    const result: Group[] = TASK_STATUSES.map((s) => ({
      key: s,
      label: STATUS_LABELS[s],
      color: STATUS_COLORS[s],
      tasks: byStatus[s].sort(sortFn),
    }));
    if (unscheduled.length) {
      result.push({ key: "UNSCHEDULED", label: "Unscheduled", color: "#9c9c98", tasks: unscheduled });
    }
    return result;
  }, [tasks]);

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggle = (k: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  // Per-task date override during/after drag (optimistic).
  const [pending, setPending] = useState<
    Record<string, { startMs: number | null; dueMs: number | null }>
  >({});
  const dragRef = useRef<{
    taskId: string;
    mode: "start" | "end" | "move";
    startX: number;
    origStartMs: number | null;
    origDueMs: number | null;
  } | null>(null);

  const dayMs = DAY_MS;

  const beginDrag = useCallback(
    (e: React.PointerEvent, task: TimelineTask, mode: "start" | "end" | "move") => {
      if (!canEdit) return;
      e.preventDefault();
      e.stopPropagation();
      (e.target as Element).setPointerCapture?.(e.pointerId);
      const startMs = task.startDate
        ? new Date(task.startDate).setHours(0, 0, 0, 0)
        : new Date(task.createdAt).setHours(0, 0, 0, 0);
      const dueMs = task.dueDate ? new Date(task.dueDate).setHours(0, 0, 0, 0) : null;
      dragRef.current = {
        taskId: task.id,
        mode,
        startX: e.clientX,
        origStartMs: startMs,
        origDueMs: dueMs,
      };
      document.body.style.cursor = mode === "move" ? "grabbing" : "ew-resize";
    },
    [canEdit],
  );

  useEffect(() => {
    function handleMove(e: PointerEvent) {
      const d = dragRef.current;
      if (!d) return;
      const deltaPx = e.clientX - d.startX;
      const deltaDays = Math.round(deltaPx / dayWidth);
      let newStart = d.origStartMs;
      let newDue = d.origDueMs;
      if (d.mode === "start" && d.origStartMs != null) {
        newStart = d.origStartMs + deltaDays * dayMs;
        if (newDue != null && newStart > newDue) newStart = newDue;
      } else if (d.mode === "end" && d.origDueMs != null) {
        newDue = d.origDueMs + deltaDays * dayMs;
        if (newStart != null && newDue < newStart) newDue = newStart;
      } else if (d.mode === "move") {
        if (d.origStartMs != null) newStart = d.origStartMs + deltaDays * dayMs;
        if (d.origDueMs != null) newDue = d.origDueMs + deltaDays * dayMs;
      }
      setPending((prev) => ({
        ...prev,
        [d.taskId]: { startMs: newStart, dueMs: newDue },
      }));
    }
    async function handleUp() {
      const d = dragRef.current;
      if (!d) return;
      dragRef.current = null;
      document.body.style.cursor = "";
      const next = pendingRef.current[d.taskId];
      if (!next) return;
      const changed =
        next.startMs !== d.origStartMs || next.dueMs !== d.origDueMs;
      if (!changed) {
        setPending((prev) => {
          const copy = { ...prev };
          delete copy[d.taskId];
          return copy;
        });
        return;
      }
      const fd = new FormData();
      fd.set("taskId", d.taskId);
      fd.set("startDate", next.startMs != null ? new Date(next.startMs).toISOString() : "");
      fd.set("dueDate", next.dueMs != null ? new Date(next.dueMs).toISOString() : "");
      try {
        const result = await updateTaskDates(null, fd);
        if (result && "error" in result && result.error) {
          // Revert on error.
          setPending((prev) => {
            const copy = { ...prev };
            delete copy[d.taskId];
            return copy;
          });
          return;
        }
        router.refresh();
      } catch {
        setPending((prev) => {
          const copy = { ...prev };
          delete copy[d.taskId];
          return copy;
        });
      }
    }
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [dayWidth, dayMs, router]);

  // Keep pending in a ref so the pointerup handler reads the latest value.
  const pendingRef = useRef(pending);
  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  // Clear stale optimistic entries once the underlying task data matches.
  useEffect(() => {
    setPending((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const t of tasks) {
        const p = next[t.id];
        if (!p) continue;
        const sMs = t.startDate ? new Date(t.startDate).setHours(0, 0, 0, 0) : null;
        const dMs = t.dueDate ? new Date(t.dueDate).setHours(0, 0, 0, 0) : null;
        if (sMs === p.startMs && dMs === p.dueMs) {
          delete next[t.id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [tasks]);

  function getBar(task: TimelineTask) {
    const override = pending[task.id];
    const dueMs = override
      ? override.dueMs
      : task.dueDate
        ? new Date(task.dueDate).setHours(0, 0, 0, 0)
        : null;
    const explicitStartMs = override
      ? override.startMs
      : task.startDate
        ? new Date(task.startDate).setHours(0, 0, 0, 0)
        : null;
    const createdMs = new Date(task.createdAt).setHours(0, 0, 0, 0);
    const startMs = explicitStartMs ?? createdMs;
    if (dueMs == null) return null;
    const effectiveStart = Math.min(startMs, dueMs);
    const s = (effectiveStart - start.getTime()) / DAY_MS;
    const e = (dueMs - start.getTime()) / DAY_MS + 1;
    return {
      left: s * dayWidth,
      width: Math.max(dayWidth * 0.75, (e - s) * dayWidth),
      isMarker: false,
      startMs: effectiveStart,
      dueMs,
    };
  }

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !todayInRange) return;
    const targetLeft = TASK_COL + todayDayOffset * dayWidth - el.clientWidth / 3;
    el.scrollLeft = Math.max(0, targetLeft);
    // Only re-scroll on zoom change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  return (
    <div className="overflow-hidden rounded-md border border-border bg-bg-elevated/60 backdrop-blur-sm">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-[11px] text-fg-muted">
          {totalDays} day{totalDays !== 1 ? "s" : ""} · {tasks.length} task{tasks.length !== 1 ? "s" : ""}
        </span>
        <div className="flex items-center gap-0.5 rounded border border-border bg-bg-secondary/50 p-0.5">
          {(["day", "week"] as Zoom[]).map((z) => (
            <button
              key={z}
              onClick={() => setZoom(z)}
              className={`cursor-pointer rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                zoom === z
                  ? "bg-bg-elevated text-fg-primary shadow-sm"
                  : "text-fg-muted hover:text-fg-secondary"
              }`}
            >
              {z === "day" ? "Day" : "Week"}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable timeline */}
      <div ref={scrollRef} className="max-h-[calc(100vh-22rem)] overflow-auto">
        <div className="relative" style={{ width: TASK_COL + totalWidth }}>
          {/* Sticky header */}
          <div className="sticky top-0 z-30 bg-bg-elevated">
            <div className="flex border-b border-border">
              <div
                className="sticky left-0 z-10 shrink-0 border-r border-border bg-bg-elevated"
                style={{ width: TASK_COL }}
              >
                <div className="flex h-6 items-center border-b border-border-subtle px-3 text-[10px] font-medium uppercase tracking-wide text-fg-muted">
                  Task
                </div>
                <div className="flex h-7 items-center px-3 text-[10px] text-fg-muted">
                  {tasks.length} item{tasks.length !== 1 ? "s" : ""}
                </div>
              </div>
              <div className="relative" style={{ width: totalWidth }}>
                {/* Month band */}
                <div className="relative h-6 border-b border-border-subtle">
                  {monthBands.map((b, i) => (
                    <div
                      key={i}
                      className="absolute top-0 flex h-full items-center border-r border-border-subtle px-2 text-[10px] font-medium uppercase tracking-wide text-fg-muted"
                      style={{ left: b.left, width: b.width }}
                    >
                      {b.label}
                    </div>
                  ))}
                </div>
                {/* Day or week band */}
                <div className="relative h-7">
                  {zoom === "day"
                    ? days.map((d, i) => {
                        const dimText = d.outOfSprint;
                        return (
                          <div
                            key={i}
                            className={`absolute top-0 flex h-full flex-col items-center justify-center border-r border-border-subtle ${
                              d.isToday
                                ? "bg-accent/15"
                                : d.outOfSprint
                                  ? "bg-bg-secondary/40"
                                  : d.isWeekend
                                    ? "bg-bg-secondary/30"
                                    : ""
                            }`}
                            style={{ left: i * dayWidth, width: dayWidth }}
                          >
                            <span
                              className={`text-[8px] uppercase leading-none ${
                                d.isToday ? "text-accent" : dimText ? "text-fg-muted/50" : "text-fg-muted"
                              }`}
                            >
                              {d.date.toLocaleDateString(undefined, { weekday: "narrow" })}
                            </span>
                            <span
                              className={`text-[10px] font-medium leading-tight ${
                                d.isToday ? "text-accent" : dimText ? "text-fg-muted/60" : "text-fg-secondary"
                              }`}
                            >
                              {d.date.getDate()}
                            </span>
                          </div>
                        );
                      })
                    : weekBands.map((b, i) => (
                        <div
                          key={i}
                          className={`absolute top-0 flex h-full items-center justify-center border-r border-border-subtle text-[10px] ${
                            b.isCurrent
                              ? "bg-accent/10 font-medium text-accent"
                              : b.outOfSprint
                                ? "bg-bg-secondary/40 text-fg-muted/50"
                                : "text-fg-muted"
                          }`}
                          style={{ left: b.left, width: b.width }}
                        >
                          {b.label}
                        </div>
                      ))}
                </div>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="relative">
            {/* Out-of-sprint and weekend shading behind rows */}
            <div
              className="pointer-events-none absolute inset-y-0 z-0"
              style={{ left: TASK_COL, width: totalWidth }}
            >
              {/* Out-of-sprint shading: before sprint */}
              {sprintStartOffset > 0 && (
                <div
                  className="absolute inset-y-0 bg-bg-secondary/40"
                  style={{ left: 0, width: sprintStartOffset * dayWidth }}
                />
              )}
              {/* Out-of-sprint shading: after sprint */}
              {sprintEndOffset < totalDays && (
                <div
                  className="absolute inset-y-0 bg-bg-secondary/40"
                  style={{
                    left: sprintEndOffset * dayWidth,
                    width: (totalDays - sprintEndOffset) * dayWidth,
                  }}
                />
              )}
              {/* Weekend strips inside sprint range (day zoom only) */}
              {zoom === "day" &&
                days.map((d, i) =>
                  d.isWeekend && !d.outOfSprint ? (
                    <div
                      key={i}
                      className="absolute inset-y-0 bg-bg-secondary/15"
                      style={{ left: i * dayWidth, width: dayWidth }}
                    />
                  ) : null,
                )}
              {/* Sprint boundary lines */}
              {sprintStartOffset > 0 && (
                <div
                  className="absolute inset-y-0 w-px bg-border"
                  style={{ left: sprintStartOffset * dayWidth }}
                />
              )}
              {sprintEndOffset < totalDays && (
                <div
                  className="absolute inset-y-0 w-px bg-border"
                  style={{ left: sprintEndOffset * dayWidth }}
                />
              )}
            </div>

            {/* Today line, full body height */}
            {todayInRange && (
              <div
                className="pointer-events-none absolute inset-y-0 z-20 w-px bg-accent/70"
                style={{ left: TASK_COL + todayDayOffset * dayWidth }}
              >
                <div className="absolute -left-[3px] -top-1 h-1.5 w-1.5 rounded-full bg-accent" />
              </div>
            )}

            {tasks.length === 0 ? (
              <div className="px-3 py-8 text-center text-xs text-fg-muted">
                No tasks in this sprint.
              </div>
            ) : (
              groups.map((g) => {
                if (g.tasks.length === 0) return null;
                const isCollapsed = collapsed.has(g.key);
                return (
                  <div key={g.key}>
                    {/* Group header */}
                    <div className="flex border-b border-border-subtle">
                      <button
                        onClick={() => toggle(g.key)}
                        className="sticky left-0 z-10 flex shrink-0 cursor-pointer items-center gap-1.5 border-r border-border bg-bg-secondary/80 px-3 text-left backdrop-blur transition-colors hover:bg-bg-secondary"
                        style={{ width: TASK_COL, height: GROUP_H }}
                      >
                        {isCollapsed ? (
                          <ChevronRight size={11} className="text-fg-muted" />
                        ) : (
                          <ChevronDown size={11} className="text-fg-muted" />
                        )}
                        <span
                          className="h-2 w-2 shrink-0 rounded-sm"
                          style={{ backgroundColor: g.color }}
                        />
                        <span className="text-[11px] font-medium text-fg-secondary">{g.label}</span>
                        <span className="ml-auto text-[10px] text-fg-muted">{g.tasks.length}</span>
                      </button>
                      <div
                        className="bg-bg-secondary/30"
                        style={{ width: totalWidth, height: GROUP_H }}
                      />
                    </div>

                    {/* Tasks */}
                    {!isCollapsed &&
                      g.tasks.map((task) => {
                        const pos = getBar(task);
                        const boardId = task.board?.id ?? task.boardId;
                        const statusColor = STATUS_COLORS[task.status];
                        return (
                          <div
                            key={task.id}
                            className="group/row flex border-b border-border-subtle last:border-b-0"
                          >
                            <div
                              className="sticky left-0 z-10 flex shrink-0 items-center gap-2 border-r border-border bg-bg-elevated px-3 group-hover/row:bg-bg-secondary/40"
                              style={{ width: TASK_COL, height: ROW_H }}
                            >
                              {task.priority !== "NONE" ? (
                                <div
                                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                                  style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
                                  title={`Priority: ${task.priority.toLowerCase()}`}
                                />
                              ) : (
                                <div className="h-1.5 w-1.5 shrink-0" />
                              )}
                              <Link
                                href={`/w/${workspaceId}/b/${boardId}/t/${task.id}`}
                                className="block min-w-0 flex-1 truncate text-[11px] text-fg-primary hover:text-accent"
                              >
                                {task.title}
                              </Link>
                              {task.board?.name && (
                                <span className="shrink-0 truncate text-[9px] text-fg-muted max-w-[60px]">
                                  {task.board.name}
                                </span>
                              )}
                            </div>
                            <div
                              className="relative"
                              style={{ width: totalWidth, height: ROW_H }}
                            >
                              {pos ? (
                                <div
                                  className={`group/bar absolute top-1.5 z-[5] flex items-center rounded-sm shadow-sm transition-shadow hover:shadow-md hover:ring-1 hover:ring-accent/40 ${
                                    canEdit && !pos.isMarker ? "cursor-grab active:cursor-grabbing" : ""
                                  }`}
                                  title={
                                    pos.isMarker
                                      ? `${task.title} · due ${pos.dueMs ? new Date(pos.dueMs).toLocaleDateString() : ""}`
                                      : `${task.title} · ${pos.startMs ? new Date(pos.startMs).toLocaleDateString() : ""} → ${pos.dueMs ? new Date(pos.dueMs).toLocaleDateString() : ""}`
                                  }
                                  onPointerDown={
                                    canEdit && !pos.isMarker
                                      ? (e) => beginDrag(e, task, "move")
                                      : undefined
                                  }
                                  style={{
                                    left: pos.left,
                                    width: pos.width,
                                    height: ROW_H - 12,
                                    backgroundColor: statusColor + (pos.isMarker ? "40" : "28"),
                                    borderLeft: `3px solid ${statusColor}`,
                                  }}
                                >
                                  {/* Left handle (start date) — only when task has a start date */}
                                  {canEdit && !pos.isMarker && (
                                    <div
                                      onPointerDown={(e) => beginDrag(e, task, "start")}
                                      className="absolute inset-y-0 left-0 z-10 w-2 cursor-ew-resize opacity-0 transition-opacity group-hover/bar:opacity-100"
                                      title="Drag to change start date"
                                    >
                                      <div
                                        className="absolute inset-y-1 left-0.5 w-0.5 rounded-full"
                                        style={{ backgroundColor: statusColor }}
                                      />
                                    </div>
                                  )}
                                  <span
                                    className="pointer-events-none truncate px-1.5 text-[10px] font-medium"
                                    style={{ color: statusColor }}
                                  >
                                    {pos.isMarker && pos.width < 60 ? "" : task.title}
                                  </span>
                                  {/* Right handle (due date) */}
                                  {canEdit && (
                                    <div
                                      onPointerDown={(e) => beginDrag(e, task, "end")}
                                      className="absolute inset-y-0 right-0 z-10 w-2 cursor-ew-resize opacity-0 transition-opacity group-hover/bar:opacity-100"
                                      title="Drag to change due date"
                                    >
                                      <div
                                        className="absolute inset-y-1 right-0.5 w-0.5 rounded-full"
                                        style={{ backgroundColor: statusColor }}
                                      />
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="flex h-full items-center px-3">
                                  <span className="text-[10px] italic text-fg-muted">
                                    No due date
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
