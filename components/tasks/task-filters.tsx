"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Search, X, ChevronDown, User } from "lucide-react";
import {
  TASK_PRIORITIES,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
} from "@/lib/task-enums";
import { UserAvatar } from "@/components/user-avatar";
import type { TaskPriority } from "@/prisma/generated/prisma/enums";

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

    const priorities =
      overrides.priority !== undefined
        ? (overrides.priority as string[])
        : currentPriorities;
    if (Array.isArray(priorities) && priorities.length > 0)
      params.set("priority", priorities.join(","));

    const tagVals =
      overrides.tag !== undefined ? (overrides.tag as string[]) : currentTags;
    if (Array.isArray(tagVals) && tagVals.length > 0)
      params.set("tag", tagVals.join(","));

    const assigneeVals =
      overrides.assignee !== undefined
        ? (overrides.assignee as string[])
        : currentAssignees;
    if (Array.isArray(assigneeVals) && assigneeVals.length > 0)
      params.set("assignee", assigneeVals.join(","));

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
    !!currentQ ||
    currentPriorities.length > 0 ||
    currentTags.length > 0 ||
    currentAssignees.length > 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative min-w-[200px] flex-1">
          <Search
            size={12}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-muted"
          />
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
                    backgroundColor:
                      PRIORITY_COLORS[v as TaskPriority] ?? "#9c9c98",
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
                      <span className="text-[9px] leading-tight text-fg-muted">
                        {t.workspaceName}
                      </span>
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
                  <UserAvatar
                    key={v}
                    name={a?.name}
                    image={a?.image}
                    size={20}
                    className="ring-1 ring-bg-elevated"
                  />
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
              label={
                PRIORITY_LABELS[p as keyof typeof PRIORITY_LABELS] ?? p
              }
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
                onRemove={() =>
                  navigate({ tag: currentTags.filter((v) => v !== t) })
                }
              />
            );
          })}
          {currentAssignees.map((a) => {
            const assignee = assignees.find((u) => u.id === a);
            return (
              <FilterChip
                key={a}
                label={
                  a === "unassigned"
                    ? "Unassigned"
                    : (assignee?.name ?? "Assignee")
                }
                avatar={
                  a !== "unassigned" ? (
                    <UserAvatar
                      name={assignee?.name}
                      image={assignee?.image}
                      size={14}
                    />
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

/* ─── Multi-select popover ─────────────────────────────────────────────── */

interface MultiSelectOption {
  value: string;
  label: string;
  node: React.ReactNode;
}

function MultiSelect({
  label,
  options,
  selected,
  onChange,
  renderSelected,
}: {
  label: string;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  renderSelected: (values: string[]) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function toggle(value: string) {
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value];
    onChange(next);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1.5 font-mono text-[11px] transition-all focus:outline-none hover:border-accent/40 hover:bg-accent/5 ${
          selected.length > 0
            ? "border-accent/40 bg-accent/5 text-fg-primary"
            : "border-border bg-bg-primary text-fg-muted"
        }`}
      >
        {selected.length > 0 ? renderSelected(selected) : label}
        <ChevronDown
          size={10}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[180px] max-h-[240px] overflow-y-auto rounded-md border border-border bg-bg-elevated shadow-lg">
          {options.map((opt) => {
            const isSelected = selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggle(opt.value)}
                className={`flex w-full cursor-pointer items-center gap-2 px-2.5 py-1.5 text-left text-[11px] transition-colors hover:bg-bg-secondary ${
                  isSelected ? "bg-accent/5" : ""
                }`}
              >
                <span
                  className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border text-[8px] ${
                    isSelected
                      ? "border-accent bg-accent text-white"
                      : "border-border"
                  }`}
                >
                  {isSelected && "✓"}
                </span>
                {opt.node}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Filter chip ──────────────────────────────────────────────────────── */

function FilterChip({
  label,
  color,
  avatar,
  onRemove,
}: {
  label: string;
  color?: string;
  avatar?: React.ReactNode;
  onRemove: () => void;
}) {
  return (
    <span
      className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-all hover:opacity-80"
      style={{
        backgroundColor: color ? `${color}15` : undefined,
        color: color ?? undefined,
      }}
    >
      {!color && !avatar && (
        <span className="text-accent" />
      )}
      {avatar}
      {color && (
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
      <span className={color ? "" : "text-accent"}>{label}</span>
      <button
        onClick={onRemove}
        className="cursor-pointer transition-opacity hover:opacity-70"
      >
        <X size={9} />
      </button>
    </span>
  );
}
