"use client";

import React, { useState } from "react";
import Link from "next/link";
import { X, Plus, Search } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";

export function AssigneeEditor({
  members,
  assigneeIds,
  onChange,
  workspaceId,
  memberIdMap,
}: {
  members: {
    id: string;
    name: string | null;
    email: string | null;
    image?: string | null;
  }[];
  assigneeIds: string[];
  onChange: (ids: string[]) => void;
  workspaceId: string;
  memberIdMap: Record<string, string>;
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [search, setSearch] = useState("");

  const assigned = members.filter((m) => assigneeIds.includes(m.id));
  const available = members.filter(
    (m) =>
      !assigneeIds.includes(m.id) &&
      (m.name?.toLowerCase().includes(search.toLowerCase()) ||
        m.email?.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div>
      <label className="block text-[11px] font-medium text-fg-muted">
        Assignees
      </label>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {assigned.map((m) => (
          <span
            key={m.id}
            className="flex items-center gap-1.5 rounded-full border border-border bg-bg-secondary px-2 py-0.5 text-xs text-fg-primary"
          >
            {memberIdMap[m.id] ? (
              <Link
                href={`/w/${workspaceId}/team/${memberIdMap[m.id]}`}
                className="flex items-center gap-1.5 transition-colors hover:text-accent"
              >
                <UserAvatar name={m.name} image={m.image} size={16} />
                {m.name ?? m.email}
              </Link>
            ) : (
              <>
                <UserAvatar name={m.name} image={m.image} size={16} />
                {m.name ?? m.email}
              </>
            )}
            <button
              type="button"
              onClick={() => onChange(assigneeIds.filter((a) => a !== m.id))}
              className="text-fg-muted hover:text-accent-emphasis"
            >
              <X size={10} />
            </button>
          </span>
        ))}

        {!showDropdown ? (
          <button
            type="button"
            onClick={() => setShowDropdown(true)}
            className="flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-0.5 text-xs text-fg-muted hover:border-accent/40 hover:text-accent"
          >
            <Plus size={10} />
            Add
          </button>
        ) : (
          <div className="relative mt-1 w-full">
            <div className="flex items-center gap-1.5 rounded-md border border-border bg-bg-primary px-2 py-1">
              <Search size={12} className="text-fg-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search members..."
                className="flex-1 bg-transparent font-mono text-xs text-fg-primary placeholder-fg-muted outline-none"
                autoFocus
              />
              <button
                type="button"
                onClick={() => {
                  setShowDropdown(false);
                  setSearch("");
                }}
                className="text-fg-muted hover:text-fg-secondary"
              >
                <X size={12} />
              </button>
            </div>
            {available.length > 0 && (
              <div className="absolute left-0 top-full z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-md border border-border bg-bg-elevated shadow-lg">
                {available.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      onChange([...assigneeIds, m.id]);
                      setSearch("");
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-fg-primary hover:bg-bg-secondary"
                  >
                    <UserAvatar name={m.name} image={m.image} size={18} />
                    <span>{m.name ?? m.email}</span>
                  </button>
                ))}
              </div>
            )}
            {available.length === 0 && search && (
              <div className="absolute left-0 top-full z-10 mt-1 w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-xs text-fg-muted shadow-lg">
                No matching members
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
