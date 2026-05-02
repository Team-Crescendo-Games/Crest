"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";
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
  subtaskIds?: string[];
  subtaskTotal?: number;
  subtaskCompleted?: number;
}

/* ── Color helpers ─────────────────────────────────────────────────────── */

/** Parse a hex color (#RGB or #RRGGBB) into [r, g, b] (0-255). */
function hexToRgb(hex: string): [number, number, number] | null {
  const h = hex.replace("#", "");
  if (h.length === 3) {
    return [
      parseInt(h[0] + h[0], 16),
      parseInt(h[1] + h[1], 16),
      parseInt(h[2] + h[2], 16),
    ];
  }
  if (h.length === 6) {
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ];
  }
  return null;
}

/** Convert RGB (0-255) to HSL (h: 0-360, s: 0-1, l: 0-1). */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s, l];
}

/* ── Tuning knobs ──────────────────────────────────────────────────────────
 * TARGET_SATURATION: how vivid the tint is (0 = grey, 1 = pure color).
 * TARGET_LIGHTNESS:  how bright the tint is (0 = black, 1 = white).
 * TINT_OPACITY:      alpha so the card bg still shows through.
 *
 * By forcing S and L to fixed values, every card has the same perceived
 * brightness regardless of which tag colors are combined — only the
 * hue shifts.
 * ────────────────────────────────────────────────────────────────────────── */
const TARGET_SATURATION = 0.95;
const TARGET_LIGHTNESS = 0.85;
const TINT_OPACITY = 0.15;

/**
 * Average all tag colors by hue (circular mean to handle the 360° wrap),
 * then normalise saturation and lightness so every card looks consistent.
 */
function averageTagColor(
  tags?: { color: string | null }[],
): string | undefined {
  if (!tags || tags.length === 0) return undefined;
  const hsls = tags
    .map((t) => (t.color ? hexToRgb(t.color) : null))
    .filter((v): v is [number, number, number] => v !== null)
    .map(([r, g, b]) => rgbToHsl(r, g, b));
  if (hsls.length === 0) return undefined;

  // Circular mean of hue (handles wrap-around, e.g. 350° + 10° → 0°)
  let sinSum = 0,
    cosSum = 0;
  for (const [h] of hsls) {
    const rad = (h * Math.PI) / 180;
    sinSum += Math.sin(rad);
    cosSum += Math.cos(rad);
  }
  const avgRad = Math.atan2(sinSum / hsls.length, cosSum / hsls.length);
  const avgHue = ((avgRad * 180) / Math.PI + 360) % 360;

  return `hsla(${Math.round(avgHue)}, ${Math.round(TARGET_SATURATION * 100)}%, ${Math.round(TARGET_LIGHTNESS * 100)}%, ${TINT_OPACITY})`;
}

/* ── Subtask radial progress ────────────────────────────────────────────── */

function SubtaskRadial({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  const ratio = total > 0 ? completed / total : 0;
  const size = 20;
  const stroke = 2;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - ratio);
  const allDone = completed === total;

  return (
    <div
      className="relative shrink-0"
      title={`${completed}/${total} subtasks done`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-border"
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={allDone ? "#6bc96b" : "var(--accent)"}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-300"
        />
      </svg>
      {/* Centered label inside the ring */}
      <span className="absolute inset-0 flex items-center justify-center text-[6px] font-medium text-fg-muted">
        {completed}/{total}
      </span>
    </div>
  );
}

/* ── Component ─────────────────────────────────────────────────────────── */

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
  highlighted = false,
  onHoverChange,
}: {
  task: TaskCardData;
  variant?: "simple" | "detailed";
  workspaceId: string;
  href?: string;
  className?: string;
  highlighted?: boolean;
  onHoverChange?: (taskId: string | null) => void;
}) {
  const router = useRouter();
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  const resolvedWorkspaceId =
    task.workspaceId || task.board?.workspaceId || workspaceId;
  const link =
    href ??
    `/w/${resolvedWorkspaceId}/b/${task.board?.id ?? task.boardId}/t/${task.id}`;

  const tagTint = averageTagColor(task.tags);

  return (
    <div
      role="link"
      tabIndex={0}
      onPointerDown={(e) => {
        pointerStart.current = { x: e.clientX, y: e.clientY };
      }}
      onClick={(e) => {
        // Only navigate if the pointer barely moved (real click, not drag release)
        if (pointerStart.current) {
          const dx = Math.abs(e.clientX - pointerStart.current.x);
          const dy = Math.abs(e.clientY - pointerStart.current.y);
          if (dx > 4 || dy > 4) return;
        }
        router.push(link);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") router.push(link);
      }}
      className={`group relative block cursor-pointer overflow-hidden rounded-md border bg-bg-elevated/60 p-3 pl-4 backdrop-blur-sm transition-all duration-150 ease-out hover:-translate-y-0.5 hover:border-accent/50 hover:ring-1 hover:ring-accent/30 hover:shadow-md hover:shadow-accent/8 ${
        highlighted
          ? "border-accent/50 ring-1 ring-accent/30 shadow-sm shadow-accent/10"
          : "border-border"
      } ${className}`}
      style={tagTint ? { backgroundColor: tagTint } : undefined}
      onMouseEnter={() => onHoverChange?.(task.id)}
      onMouseLeave={() => onHoverChange?.(null)}
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
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {variant === "detailed" && task.points != null && (
            <span className="rounded bg-bg-secondary px-1 py-px font-mono text-[10px] text-fg-muted">
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

      {/* Row 4: assignee avatars + subtask progress + due date */}
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
        <div className="flex items-center gap-2">
          {(task.subtaskTotal ?? 0) > 0 && (
            <SubtaskRadial
              completed={task.subtaskCompleted ?? 0}
              total={task.subtaskTotal!}
            />
          )}
          {task.dueDate && (
            <span className="text-[11px] text-fg-muted">
              {new Date(task.dueDate).toLocaleDateString(undefined, {
                timeZone: "UTC",
              })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
