"use client";

import { useState } from "react";
import { ChevronDown, Activity } from "lucide-react";
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

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  CREATED: "created this task",
  STATUS_CHANGED: "changed status",
  PRIORITY_CHANGED: "changed priority",
  ASSIGNED: "assigned",
  UNASSIGNED: "unassigned",
  MOVED_TO_SPRINT: "moved to sprint",
  REMOVED_FROM_SPRINT: "removed from sprint",
  EDITED: "edited this task",
  COMMENTED: "commented",
  ATTACHMENT_ADDED: "added an attachment",
};

function formatValue(value: string | null): string {
  if (!value) return "—";
  return value.replace(/_/g, " ").toLowerCase();
}

function describeActivity(a: ActivityItem): string {
  const who = a.user.name ?? "Someone";
  const base = ACTIVITY_LABELS[a.type] ?? a.type;

  if (
    (a.type === "STATUS_CHANGED" || a.type === "PRIORITY_CHANGED") &&
    a.oldValue &&
    a.newValue
  ) {
    return `${who} ${base} from ${formatValue(a.oldValue)} to ${formatValue(a.newValue)}`;
  }

  return `${who} ${base}`;
}

export function ActivityLog({
  activities,
  createdAt,
  createdByName,
}: {
  activities: ActivityItem[];
  createdAt: Date;
  createdByName: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const totalCount = activities.length + 1; // +1 for the "created" entry

  return (
    <div className="mt-8 opacity-50">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="group flex items-center gap-2 font-mono text-xs font-medium text-fg-muted transition-colors hover:text-fg-secondary"
      >
        <ChevronDown
          size={13}
          className={`transition-transform ${expanded ? "" : "-rotate-90"}`}
        />
        <Activity size={13} />
        Activity
        <span className="text-[11px]">({totalCount})</span>
      </button>

      {expanded && (
        <div className="mt-2 space-y-1.5 border-l border-border-subtle pl-3">
          {activities.map((a) => (
            <div key={a.id} className="text-[10px] text-fg-muted">
              <span>{describeActivity(a)}</span>
              <span className="ml-1.5 text-fg-muted/60">
                {new Date(a.createdAt).toLocaleDateString()}{" "}
                {new Date(a.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          ))}
          {/* Task creation — always the last entry */}
          <div className="text-[10px] text-fg-muted">
            <span>{createdByName ?? "Someone"} created this task</span>
            <span className="ml-1.5 text-fg-muted/60">
              {new Date(createdAt).toLocaleDateString()}{" "}
              {new Date(createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
