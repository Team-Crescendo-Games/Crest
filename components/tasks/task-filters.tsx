"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { Search, User } from "lucide-react";
import { TASK_PRIORITIES, PRIORITY_LABELS, PRIORITY_COLORS } from "@/lib/task-enums";
import { UserAvatar } from "@/components/common/user-avatar";
import type { TaskPriority } from "@/prisma/generated/prisma/enums";
import { MultiSelect, FilterChip } from "./multi-select";

interface Props {
  tags: { name: string; color: string | null; workspaceName?: string }[];
  assignees: { id: string; name: string | null; image?: string | null }[];
  currentQ?: string;
  currentPriorities: string[];
  currentTags: string[];
  currentAssignees: string[];
  /** Extra URL params to preserve across filter navigations (e.g. board, showArchived). */
  extraParams?: Record<string, string | undefined>;
  /** Extra controls to render inline after the built-in filter dropdowns. */
  extraControls?: React.ReactNode;
  /** Hide the assignee filter dropdown (e.g. on the dashboard where tasks are always "mine"). */
  hideAssignees?: boolean;
}

export function TaskFilters({
  tags,
  assignees,
  currentQ,
  currentPriorities,
  currentTags,
  currentAssignees,
  extraParams,
  extraControls,
  hideAssignees,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState(currentQ ?? "");

  function buildUrl(overrides: Record<string, string[] | string | undefined>) {
    const params = new URLSearchParams();

    const qVal = overrides.q !== undefined ? overrides.q : currentQ;
    if (typeof qVal === "string" && qVal) params.set("q", qVal);

    const priorities = overrides.priority !== undefined ? (overrides.priority as string[]) : currentPriorities;
    if (Array.isArray(priorities) && priorities.length > 0) params.set("priority", priorities.join(","));

    const tagVals = overrides.tag !== undefined ? (overrides.tag as string[]) : currentTags;
    if (Array.isArray(tagVals) && tagVals.length > 0) params.set("tag", tagVals.join(","));

    const assigneeVals = overrides.assignee !== undefined ? (overrides.assignee as string[]) : currentAssignees;
    if (Array.isArray(assigneeVals) && assigneeVals.length > 0) params.set("assignee", assigneeVals.join(","));

    // Preserve extra params (e.g. board, showArchived) but reset page on filter change
    if (extraParams) {
      for (const [key, val] of Object.entries(extraParams)) {
        if (key === "page") continue; // reset page when filters change
        if (val) params.set(key, val);
      }
    }

    const qs = params.toString();
    return `${pathname}${qs ? `?${qs}` : ""}`;
  }

  function navigate(overrides: Record<string, string[] | string | undefined>) {
    router.push(buildUrl(overrides));
  }

  const hasFilters =
    !!currentQ || currentPriorities.length > 0 || currentTags.length > 0 || currentAssignees.length > 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative min-w-[200px] flex-1">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-muted" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") navigate({ q: q || undefined });
            }}
            placeholder="Search tasks..."
            className="w-full rounded-md border border-border bg-bg-primary py-1.5 pl-7 pr-3 font-mono text-xs text-fg-primary placeholder-fg-muted transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/50"
          />
        </div>

        {/* Priority multi-select */}
        <MultiSelect
          label="Priority"
          selected={currentPriorities}
          onChange={(vals) => navigate({ priority: vals })}
          options={TASK_PRIORITIES.map((p) => ({
            value: p,
            label: PRIORITY_LABELS[p],
            node: (
              <span className="flex items-center gap-2">
                <span
                  className="inline-block h-2 w-2 rounded-full shrink-0"
                  style={{
                    backgroundColor: PRIORITY_COLORS[p as TaskPriority],
                  }}
                />
                {PRIORITY_LABELS[p]}
              </span>
            ),
          }))}
          renderSelected={(vals) => (
            <span className="flex items-center gap-1">
              {vals.map((v) => (
                <span
                  key={v}
                  className="inline-block h-2 w-2 rounded-full"
                  style={{
                    backgroundColor: PRIORITY_COLORS[v as TaskPriority] ?? "#9c9c98",
                  }}
                />
              ))}
            </span>
          )}
        />

        {/* Tag multi-select */}
        {tags.length > 0 && (
          <MultiSelect
            label="Tag"
            selected={currentTags}
            onChange={(vals) => navigate({ tag: vals })}
            options={tags.map((t) => ({
              value: t.name,
              label: t.name,
              node: (
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block h-2 w-2 rounded-full shrink-0"
                    style={{
                      backgroundColor: t.color ?? "#6B7280",
                    }}
                  />
                  <span className="flex flex-col">
                    <span>{t.name}</span>
                    {t.workspaceName && (
                      <span className="text-[9px] leading-tight text-fg-muted">{t.workspaceName}</span>
                    )}
                  </span>
                </span>
              ),
            }))}
            renderSelected={(vals) => (
              <span className="flex items-center gap-1">
                {vals.map((v) => {
                  const tag = tags.find((t) => t.name === v);
                  return (
                    <span
                      key={v}
                      className="inline-block h-2 w-2 rounded-full"
                      style={{
                        backgroundColor: tag?.color ?? "#6B7280",
                      }}
                    />
                  );
                })}
              </span>
            )}
          />
        )}

        {/* Assignee multi-select */}
        {!hideAssignees && (
          <MultiSelect
            label="Assignee"
            selected={currentAssignees}
            onChange={(vals) => navigate({ assignee: vals })}
            options={[
              {
                value: "unassigned",
                label: "Unassigned",
                node: (
                  <span className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-bg-secondary">
                      <User size={10} className="text-fg-muted" />
                    </span>
                    Unassigned
                  </span>
                ),
              },
              ...assignees.map((a) => ({
                value: a.id,
                label: a.name ?? "Unknown",
                node: (
                  <span className="flex items-center gap-2">
                    <UserAvatar name={a.name} image={a.image} size={20} />
                    {a.name ?? "Unknown"}
                  </span>
                ),
              })),
            ]}
            renderSelected={(vals) => (
              <span className="flex items-center -space-x-1">
                {vals.slice(0, 3).map((v) => {
                  if (v === "unassigned") {
                    return (
                      <span
                        key={v}
                        className="flex h-5 w-5 items-center justify-center rounded-full bg-bg-secondary ring-1 ring-bg-elevated"
                      >
                        <User size={10} className="text-fg-muted" />
                      </span>
                    );
                  }
                  const a = assignees.find((a) => a.id === v);
                  return (
                    <UserAvatar key={v} name={a?.name} image={a?.image} size={20} className="ring-1 ring-bg-elevated" />
                  );
                })}
                {vals.length > 3 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-bg-secondary text-[8px] font-medium text-fg-muted ring-1 ring-bg-elevated">
                    +{vals.length - 3}
                  </span>
                )}
              </span>
            )}
          />
        )}

        {extraControls}
      </div>

      {/* Active filter chips */}
      {hasFilters && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-fg-muted">Filters:</span>
          {currentQ && (
            <FilterChip
              label={`"${currentQ}"`}
              onRemove={() => {
                setQ("");
                navigate({ q: undefined });
              }}
            />
          )}
          {currentPriorities.map((p) => (
            <FilterChip
              key={p}
              color={PRIORITY_COLORS[p as TaskPriority]}
              label={PRIORITY_LABELS[p as keyof typeof PRIORITY_LABELS] ?? p}
              onRemove={() =>
                navigate({
                  priority: currentPriorities.filter((v) => v !== p),
                })
              }
            />
          ))}
          {currentTags.map((t) => {
            const tag = tags.find((tg) => tg.name === t);
            return (
              <FilterChip
                key={t}
                color={tag?.color ?? undefined}
                label={t}
                onRemove={() => navigate({ tag: currentTags.filter((v) => v !== t) })}
              />
            );
          })}
          {currentAssignees.map((a) => {
            const assignee = assignees.find((u) => u.id === a);
            return (
              <FilterChip
                key={a}
                label={a === "unassigned" ? "Unassigned" : (assignee?.name ?? "Assignee")}
                avatar={
                  a !== "unassigned" ? (
                    <UserAvatar name={assignee?.name} image={assignee?.image} size={14} />
                  ) : undefined
                }
                onRemove={() =>
                  navigate({
                    assignee: currentAssignees.filter((v) => v !== a),
                  })
                }
              />
            );
          })}
          <button
            onClick={() => {
              setQ("");
              const params = new URLSearchParams();
              if (extraParams) {
                for (const [key, val] of Object.entries(extraParams)) {
                  if (key === "page") continue;
                  if (val) params.set(key, val);
                }
              }
              const qs = params.toString();
              router.push(`${pathname}${qs ? `?${qs}` : ""}`);
            }}
            className="cursor-pointer text-[11px] text-accent transition-colors hover:text-accent-emphasis"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

