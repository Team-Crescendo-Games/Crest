"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface Props {
  workspaces: { id: string; name: string }[];
  boards: { id: string; name: string; workspaceName: string }[];
  currentWorkspaces: string[];
  currentBoards: string[];
}

export function DashboardFilterDropdowns({
  workspaces,
  boards,
  currentWorkspaces,
  currentBoards,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function navigate(overrides: Record<string, string[] | undefined>) {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, vals] of Object.entries(overrides)) {
      if (vals && vals.length > 0) {
        params.set(key, vals.join(","));
      } else {
        params.delete(key);
      }
    }

    // When workspace changes, clear board filter (boards depend on workspace)
    if ("workspace" in overrides) {
      params.delete("board");
    }

    // Reset page on filter change
    params.delete("page");

    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`);
  }

  return (
    <>
      <MultiSelect
        label="Workspace"
        selected={currentWorkspaces}
        onChange={(vals) => navigate({ workspace: vals })}
        options={workspaces.map((w) => ({
          value: w.id,
          label: w.name,
          node: (
            <span className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-accent/10 text-[10px] font-bold text-accent">
                {w.name.charAt(0).toUpperCase()}
              </span>
              {w.name}
            </span>
          ),
        }))}
        renderSelected={(vals) => {
          if (vals.length === 1) {
            const w = workspaces.find((w) => w.id === vals[0]);
            return (
              <span className="truncate max-w-[100px]">
                {w?.name ?? "Workspace"}
              </span>
            );
          }
          return <span>{vals.length} workspaces</span>;
        }}
      />

      {boards.length > 0 && (
        <MultiSelect
          label="Board"
          selected={currentBoards}
          onChange={(vals) => navigate({ board: vals })}
          options={boards.map((b) => ({
            value: b.id,
            label: b.name,
            node: (
              <span className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-bg-secondary text-[10px] font-medium text-fg-muted">
                  B
                </span>
                <span className="flex flex-col">
                  <span>{b.name}</span>
                  <span className="text-[9px] text-fg-muted">
                    {b.workspaceName}
                  </span>
                </span>
              </span>
            ),
          }))}
          renderSelected={(vals) => {
            if (vals.length === 1) {
              const b = boards.find((b) => b.id === vals[0]);
              return (
                <span className="truncate max-w-[100px]">
                  {b?.name ?? "Board"}
                </span>
              );
            }
            return <span>{vals.length} boards</span>;
          }}
        />
      )}
    </>
  );
}

/* ─── Multi-select popover (same pattern as task-filters) ──────────────── */

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
        className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 font-mono text-[11px] transition-colors focus:outline-none ${
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
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[200px] max-h-[240px] overflow-y-auto rounded-md border border-border bg-bg-elevated shadow-lg">
          {options.map((opt) => {
            const isSelected = selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggle(opt.value)}
                className={`flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[11px] transition-colors hover:bg-bg-secondary ${
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
