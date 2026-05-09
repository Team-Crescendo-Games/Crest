"use client";

import  { useState } from "react";
import Link from "next/link";
import { Plus, Check } from "lucide-react";

export function SprintEditor({
  sprints,
  selectedIds,
  onChange,
  workspaceId,
}: {
  sprints: { id: string; title: string }[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  workspaceId: string;
}) {
  const [open, setOpen] = useState(false);

  function toggle(id: string) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  }

  const selected = sprints.filter((s) => selectedIds.includes(s.id));

  return (
    <div className="relative">
      {selected.length > 0 ? (
        <div className="space-y-0.5">
          {selected.map((s) => (
            <Link
              key={s.id}
              href={`/w/${workspaceId}/s/${s.id}`}
              className="block text-[11px] text-accent transition-colors hover:text-accent-emphasis"
            >
              {s.title}
            </Link>
          ))}
        </div>
      ) : (
        <span className="text-[11px] text-fg-muted">None</span>
      )}

      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="mt-1 flex items-center gap-1 text-[10px] text-fg-muted transition-colors hover:text-fg-secondary"
      >
        <Plus size={10} />
        {selected.length > 0 ? "Edit sprints" : "Add to sprint"}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 w-52 rounded-md border border-border bg-bg-elevated shadow-lg">
            <div className="max-h-48 overflow-y-auto p-1">
              {sprints.length === 0 && <p className="px-3 py-2 text-[11px] text-fg-muted">No sprints</p>}
              {sprints.map((sprint) => {
                const isSelected = selectedIds.includes(sprint.id);
                return (
                  <button
                    key={sprint.id}
                    type="button"
                    onClick={() => toggle(sprint.id)}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-bg-secondary"
                  >
                    <div
                      className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${
                        isSelected ? "border-accent bg-accent" : "border-border"
                      }`}
                    >
                      {isSelected && <Check size={9} className="text-bg-primary" />}
                    </div>
                    <span className={isSelected ? "font-medium text-fg-primary" : "text-fg-secondary"}>
                      {sprint.title}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end border-t border-border px-2 py-1.5">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded bg-accent px-2 py-1 text-[11px] font-medium text-bg-primary hover:bg-accent-emphasis"
              >
                Done
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
