"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, X } from "lucide-react";

interface Props {
  workspaceId: string;
  boards: { id: string; name: string }[];
  tags: { name: string; color: string | null }[];
  currentQ?: string;
  currentBoard?: string;
  currentStatus?: string;
  currentTag?: string;
  showArchived: boolean;
  archivedCount: number;
}

export function BoardFilters({
  workspaceId,
  boards,
  tags,
  currentQ,
  currentBoard,
  currentStatus,
  currentTag,
  showArchived,
  archivedCount,
}: Props) {
  const router = useRouter();
  const [q, setQ] = useState(currentQ ?? "");

  function buildUrl(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const values = {
      q: overrides.q !== undefined ? overrides.q : currentQ,
      board: overrides.board !== undefined ? overrides.board : currentBoard,
      status: overrides.status !== undefined ? overrides.status : currentStatus,
      tag: overrides.tag !== undefined ? overrides.tag : currentTag,
      showArchived:
        overrides.showArchived !== undefined
          ? overrides.showArchived
          : showArchived
            ? "true"
            : undefined,
    };

    Object.entries(values).forEach(([key, val]) => {
      if (val) params.set(key, val);
    });

    const qs = params.toString();
    return `/dashboard/workspaces/${workspaceId}/boards${qs ? `?${qs}` : ""}`;
  }

  function navigate(overrides: Record<string, string | undefined>) {
    router.push(buildUrl(overrides));
  }

  const hasFilters = currentBoard || currentStatus || currentTag || currentQ;

  return (
    <div className="space-y-2">
      {/* Search + filters row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            size={12}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-muted"
          />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                navigate({ q: q || undefined });
              }
            }}
            placeholder="Search tasks..."
            className="w-full rounded-md border border-border bg-bg-primary py-1.5 pl-7 pr-3 font-mono text-xs text-fg-primary placeholder-fg-muted transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/50"
          />
        </div>

        <select
          value={currentBoard ?? ""}
          onChange={(e) => navigate({ board: e.target.value || undefined })}
          className="rounded-md border border-border bg-bg-primary px-2 py-1.5 font-mono text-[11px] text-fg-primary transition-colors focus:border-accent focus:outline-none"
        >
          <option value="">All boards</option>
          {boards.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

        <select
          value={currentStatus ?? ""}
          onChange={(e) => navigate({ status: e.target.value || undefined })}
          className="rounded-md border border-border bg-bg-primary px-2 py-1.5 font-mono text-[11px] text-fg-primary transition-colors focus:border-accent focus:outline-none"
        >
          <option value="">All statuses</option>
          <option value="NOT_STARTED">Not Started</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="IN_REVIEW">In Review</option>
          <option value="COMPLETED">Completed</option>
        </select>

        {tags.length > 0 && (
          <select
            value={currentTag ?? ""}
            onChange={(e) => navigate({ tag: e.target.value || undefined })}
            className="rounded-md border border-border bg-bg-primary px-2 py-1.5 font-mono text-[11px] text-fg-primary transition-colors focus:border-accent focus:outline-none"
          >
            <option value="">All tags</option>
            {tags.map((t) => (
              <option key={t.name} value={t.name}>
                {t.name}
              </option>
            ))}
          </select>
        )}

        {archivedCount > 0 && (
          <button
            onClick={() =>
              navigate({
                showArchived: showArchived ? undefined : "true",
              })
            }
            className="shrink-0 rounded-md border border-border px-2 py-1.5 text-[11px] text-fg-muted transition-colors hover:text-fg-secondary"
          >
            {showArchived ? "Hide archived" : `Archived (${archivedCount})`}
          </button>
        )}
      </div>

      {/* Active filter chips */}
      {hasFilters && (
        <div className="flex items-center gap-1.5">
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
          {currentBoard && (
            <FilterChip
              label={boards.find((b) => b.id === currentBoard)?.name ?? "Board"}
              onRemove={() => navigate({ board: undefined })}
            />
          )}
          {currentStatus && (
            <FilterChip
              label={currentStatus.replace(/_/g, " ").toLowerCase()}
              onRemove={() => navigate({ status: undefined })}
            />
          )}
          {currentTag && (
            <FilterChip
              label={currentTag}
              onRemove={() => navigate({ tag: undefined })}
            />
          )}
          <button
            onClick={() => {
              setQ("");
              router.push(
                `/dashboard/workspaces/${workspaceId}/boards${
                  showArchived ? "?showArchived=true" : ""
                }`,
              );
            }}
            className="text-[11px] text-accent hover:text-accent-emphasis"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

function FilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
      {label}
      <button onClick={onRemove} className="hover:text-accent-emphasis">
        <X size={9} />
      </button>
    </span>
  );
}
