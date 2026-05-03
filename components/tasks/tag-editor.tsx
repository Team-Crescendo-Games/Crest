"use client";

import React from "react";

export function TagEditor({
  tags,
  selectedTagIds,
  onChange,
}: {
  tags: { id: string; name: string; color: string | null }[];
  selectedTagIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const selected = new Set(selectedTagIds);

  return (
    <div>
      <label className="block text-[11px] font-medium text-fg-muted">
        Tags
      </label>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {tags.map((tag) => {
          const color = tag.color ?? "#6B7280";
          const isSelected = selected.has(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() =>
                onChange(
                  isSelected
                    ? selectedTagIds.filter((x) => x !== tag.id)
                    : [...selectedTagIds, tag.id],
                )
              }
              className="cursor-pointer rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all"
              style={{
                borderColor: color + (isSelected ? "80" : "40"),
                color: isSelected ? "#fff" : color,
                backgroundColor: isSelected ? color : "transparent",
              }}
            >
              {tag.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
