"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { Search, User, Archive } from "lucide-react";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  STATUS_LABELS,
  STATUS_COLORS,
  serializeSorts,
  type SortOption,
} from "@/lib/task-enums";
import type { TaskPriority, TaskStatus } from "@/prisma/generated/prisma/enums";
import { UserAvatar } from "@/components/common/user-avatar";
import { MultiSelect, FilterChip } from "./multi-select";
import { SortControls } from "./sort-controls";

interface Props {
  boards: { id: string; name: string }[];
  sprints: { id: string; title: string }[];
  tags: { name: string; color: string | null }[];
  assignees: { id: string; name: string | null; image?: string | null }[];
  current: {
    q?: string;
    priorities: string[];
    statuses: string[];
    tags: string[];
    assignees: string[];
    boards: string[];
    sprints: string[];
    sorts: SortOption[];
    showArchived: boolean;
  };
}

export function TaskSearchFilters({ boards, sprints, tags, assignees, current }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState(current.q ?? "");

  function buildUrl(overrides: Partial<Props["current"]>) {
    const params = new URLSearchParams();
    const next = { ...current, ...overrides };

    if (next.q) params.set("q", next.q);
    if (next.priorities.length > 0) params.set("priority", next.priorities.join(","));
    if (next.statuses.length > 0) params.set("status", next.statuses.join(","));
    if (next.tags.length > 0) params.set("tag", next.tags.join(","));
    if (next.assignees.length > 0) params.set("assignee", next.assignees.join(","));
    if (next.boards.length > 0) params.set("board", next.boards.join(","));
    if (next.sprints.length > 0) params.set("sprint", next.sprints.join(","));
    if (next.sorts.length > 0) params.set("sort", serializeSorts(next.sorts));
    if (next.showArchived) params.set("showArchived", "1");

    const qs = params.toString();
    return `${pathname}${qs ? `?${qs}` : ""}`;
  }

  function navigate(overrides: Partial<Props["current"]>) {
    router.push(buildUrl(overrides));
  }

  const hasFilters =
    !!current.q ||
    current.priorities.length > 0 ||
    current.statuses.length > 0 ||
    current.tags.length > 0 ||
    current.assignees.length > 0 ||
    current.boards.length > 0 ||
    current.sprints.length > 0 ||
    current.showArchived;

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

        {/* Boards */}
        {boards.length > 0 && (
          <MultiSelect
            label="Board"
            selected={current.boards}
            onChange={(vals) => navigate({ boards: vals })}
            options={boards.map((b) => ({
              value: b.id,
              label: b.name,
              node: <span>{b.name}</span>,
            }))}
            renderSelected={(vals) => (
              <span className="truncate max-w-[120px]">
                {vals.length === 1 ? (boards.find((b) => b.id === vals[0])?.name ?? "Board") : `${vals.length} boards`}
              </span>
            )}
          />
        )}

        {/* Sprints */}
        {sprints.length > 0 && (
          <MultiSelect
            label="Sprint"
            selected={current.sprints}
            onChange={(vals) => navigate({ sprints: vals })}
            options={sprints.map((s) => ({
              value: s.id,
              label: s.title,
              node: <span>{s.title}</span>,
            }))}
            renderSelected={(vals) => (
              <span className="truncate max-w-[120px]">
                {vals.length === 1
                  ? (sprints.find((s) => s.id === vals[0])?.title ?? "Sprint")
                  : `${vals.length} sprints`}
              </span>
            )}
          />
        )}

        {/* Status */}
        <MultiSelect
          label="Status"
          selected={current.statuses}
          onChange={(vals) => navigate({ statuses: vals })}
          options={TASK_STATUSES.map((s) => ({
            value: s,
            label: STATUS_LABELS[s],
            node: (
              <span className="flex items-center gap-2">
                <span
                  className="inline-block h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: STATUS_COLORS[s as TaskStatus] }}
                />
                {STATUS_LABELS[s]}
              </span>
            ),
          }))}
          renderSelected={(vals) => (
            <span className="flex items-center gap-1">
              {vals.map((v) => (
                <span
                  key={v}
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: STATUS_COLORS[v as TaskStatus] ?? "#9c9c98" }}
                />
              ))}
            </span>
          )}
        />

        {/* Priority */}
        <MultiSelect
          label="Priority"
          selected={current.priorities}
          onChange={(vals) => navigate({ priorities: vals })}
          options={TASK_PRIORITIES.map((p) => ({
            value: p,
            label: PRIORITY_LABELS[p],
            node: (
              <span className="flex items-center gap-2">
                <span
                  className="inline-block h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: PRIORITY_COLORS[p as TaskPriority] }}
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
                  style={{ backgroundColor: PRIORITY_COLORS[v as TaskPriority] ?? "#9c9c98" }}
                />
              ))}
            </span>
          )}
        />

        {/* Tags */}
        {tags.length > 0 && (
          <MultiSelect
            label="Tag"
            selected={current.tags}
            onChange={(vals) => navigate({ tags: vals })}
            options={tags.map((t) => ({
              value: t.name,
              label: t.name,
              node: (
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: t.color ?? "#6B7280" }}
                  />
                  {t.name}
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
                      style={{ backgroundColor: tag?.color ?? "#6B7280" }}
                    />
                  );
                })}
              </span>
            )}
          />
        )}

        {/* Assignees */}
        <MultiSelect
          label="Assignee"
          selected={current.assignees}
          onChange={(vals) => navigate({ assignees: vals })}
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

        {/* Show archived toggle */}
        <button
          type="button"
          onClick={() => navigate({ showArchived: !current.showArchived })}
          title={current.showArchived ? "Hide tasks from archived boards" : "Show tasks from archived boards"}
          className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1.5 font-mono text-[11px] transition-all focus:outline-none hover:border-accent/40 hover:bg-accent/5 ${
            current.showArchived
              ? "border-accent/40 bg-accent/5 text-fg-primary"
              : "border-border bg-bg-primary text-fg-muted"
          }`}
        >
          <Archive size={11} />
          Archived
        </button>

        <SortControls currentSorts={current.sorts} />
      </div>

      {/* Active filter chips */}
      {hasFilters && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-fg-muted">Filters:</span>
          {current.q && (
            <FilterChip
              label={`"${current.q}"`}
              onRemove={() => {
                setQ("");
                navigate({ q: undefined });
              }}
            />
          )}
          {current.boards.map((id) => {
            const b = boards.find((x) => x.id === id);
            return (
              <FilterChip
                key={id}
                label={b?.name ?? "Board"}
                onRemove={() => navigate({ boards: current.boards.filter((v) => v !== id) })}
              />
            );
          })}
          {current.sprints.map((id) => {
            const s = sprints.find((x) => x.id === id);
            return (
              <FilterChip
                key={id}
                label={s?.title ?? "Sprint"}
                onRemove={() => navigate({ sprints: current.sprints.filter((v) => v !== id) })}
              />
            );
          })}
          {current.statuses.map((s) => (
            <FilterChip
              key={s}
              color={STATUS_COLORS[s as TaskStatus]}
              label={STATUS_LABELS[s as TaskStatus] ?? s}
              onRemove={() => navigate({ statuses: current.statuses.filter((v) => v !== s) })}
            />
          ))}
          {current.priorities.map((p) => (
            <FilterChip
              key={p}
              color={PRIORITY_COLORS[p as TaskPriority]}
              label={PRIORITY_LABELS[p as TaskPriority] ?? p}
              onRemove={() => navigate({ priorities: current.priorities.filter((v) => v !== p) })}
            />
          ))}
          {current.tags.map((t) => {
            const tag = tags.find((tg) => tg.name === t);
            return (
              <FilterChip
                key={t}
                color={tag?.color ?? undefined}
                label={t}
                onRemove={() => navigate({ tags: current.tags.filter((v) => v !== t) })}
              />
            );
          })}
          {current.assignees.map((a) => {
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
                onRemove={() => navigate({ assignees: current.assignees.filter((v) => v !== a) })}
              />
            );
          })}
          {current.showArchived && (
            <FilterChip label="Archived included" onRemove={() => navigate({ showArchived: false })} />
          )}
          <button
            onClick={() => {
              setQ("");
              router.push(pathname);
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
