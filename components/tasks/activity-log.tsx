"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import type { ActivityType } from "@/prisma/generated/prisma/enums";

interface ActivityItem {
  id: string;
  type: ActivityType;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: Date;
  user: { name: string | null };
}

interface NameMaps {
  members: Record<string, string>;
  sprints: Record<string, string>;
  boards: Record<string, string>;
  tags: Record<string, string>;
}

function formatEnum(value: string): string {
  return value.replace(/_/g, " ").toLowerCase();
}

function formatDateValue(iso: string | null): string {
  if (!iso) return "none";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString();
}

function lookup(map: Record<string, string>, id: string | null, fallback = "(deleted)"): string {
  if (!id) return fallback;
  return map[id] ?? fallback;
}

function K({ children }: { children: ReactNode }) {
  return <span className="text-fg-secondary">{children}</span>;
}

function describeActivity(a: ActivityItem, names: NameMaps): ReactNode {
  const who = <K>{a.user.name ?? "Someone"}</K>;

  switch (a.type) {
    case "CREATED":
      return <>{who} created this task</>;

    case "STATUS_CHANGED":
      return (
        <>
          {who} changed status from <K>{formatEnum(a.oldValue ?? "none")}</K> to{" "}
          <K>{formatEnum(a.newValue ?? "none")}</K>
        </>
      );

    case "PRIORITY_CHANGED":
      return (
        <>
          {who} changed priority from <K>{formatEnum(a.oldValue ?? "none")}</K> to{" "}
          <K>{formatEnum(a.newValue ?? "none")}</K>
        </>
      );

    case "ASSIGNED":
      return (
        <>
          {who} assigned <K>{lookup(names.members, a.newValue)}</K>
        </>
      );

    case "UNASSIGNED":
      return (
        <>
          {who} unassigned <K>{lookup(names.members, a.oldValue)}</K>
        </>
      );

    case "MOVED_TO_SPRINT":
      return (
        <>
          {who} moved this task to sprint <K>{lookup(names.sprints, a.newValue)}</K>
        </>
      );

    case "REMOVED_FROM_SPRINT":
      return (
        <>
          {who} removed this task from sprint <K>{lookup(names.sprints, a.oldValue)}</K>
        </>
      );

    case "COMMENTED":
      return <>{who} commented</>;

    case "ATTACHMENT_ADDED":
      return a.newValue ? (
        <>
          {who} added attachment <K>{a.newValue}</K>
        </>
      ) : (
        <>{who} added an attachment</>
      );

    case "EDITED":
      return describeEdit(who, a, names);

    default:
      return (
        <>
          {who} <K>{formatEnum(a.type)}</K>
        </>
      );
  }
}

function describeEdit(who: ReactNode, a: ActivityItem, names: NameMaps): ReactNode {
  switch (a.field) {
    case "title":
      return <>{who} edited the title</>;

    case "description":
      return <>{who} edited the description</>;

    case "points":
      return (
        <>
          {who} changed points from <K>{a.oldValue ?? "none"}</K> to <K>{a.newValue ?? "none"}</K>
        </>
      );

    case "dueDate":
      return (
        <>
          {who} changed due date from <K>{formatDateValue(a.oldValue)}</K> to{" "}
          <K>{formatDateValue(a.newValue)}</K>
        </>
      );

    case "startDate":
      return (
        <>
          {who} changed start date from <K>{formatDateValue(a.oldValue)}</K> to{" "}
          <K>{formatDateValue(a.newValue)}</K>
        </>
      );

    case "board":
      return (
        <>
          {who} moved this task from board <K>{lookup(names.boards, a.oldValue)}</K> to{" "}
          <K>{lookup(names.boards, a.newValue)}</K>
        </>
      );

    case "tag_added":
      return (
        <>
          {who} added tag <K>{lookup(names.tags, a.newValue)}</K>
        </>
      );

    case "tag_removed":
      return (
        <>
          {who} removed tag <K>{lookup(names.tags, a.oldValue)}</K>
        </>
      );

    default:
      return <>{who} edited this task</>;
  }
}

export function ActivityLog({
  activities,
  memberNames,
  sprintNames,
  boardNames,
  tagNames,
}: {
  activities: ActivityItem[];
  memberNames: Record<string, string>;
  sprintNames: Record<string, string>;
  boardNames: Record<string, string>;
  tagNames: Record<string, string>;
}) {
  const [expanded, setExpanded] = useState(false);
  const names: NameMaps = {
    members: memberNames,
    sprints: sprintNames,
    boards: boardNames,
    tags: tagNames,
  };

  return (
    <div className="mt-8">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="cursor-pointer group flex items-center gap-2 font-mono text-xs font-medium text-fg-secondary transition-colors hover:text-fg-primary"
      >
        <ChevronDown size={13} className={`transition-transform ${expanded ? "" : "-rotate-90"}`} />
        Activities
        <span className="text-[11px]">({activities.length})</span>
      </button>

      {expanded && (
        <div className="mt-2 space-y-1.5 border-l border-border-subtle pl-3">
          {activities.map((a) => (
            <div key={a.id} className="flex items-baseline gap-3 text-[10px] text-fg-muted">
              <span className="flex-1 min-w-0">{describeActivity(a, names)}</span>
              <span className="shrink-0 text-fg-muted">
                {new Date(a.createdAt).toLocaleDateString()}{" "}
                {new Date(a.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
