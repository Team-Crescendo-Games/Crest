"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, X, Plus, ChevronDown } from "lucide-react";
import {
  SORT_FIELD_LABELS,
  SORT_DIRECTION_LABELS,
  serializeSorts,
  type SortField,
  type SortDirection,
  type SortOption,
} from "@/lib/task-enums";

const SORT_FIELDS: SortField[] = ["dueDate", "startDate", "priority", "points"];

interface Props {
  /** Current active sort options parsed from URL. */
  currentSorts: SortOption[];
  /** Extra URL params to preserve across sort navigations. */
  extraParams?: Record<string, string | undefined>;
}

export function SortControls({ currentSorts, extraParams }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const navigate = useCallback(
    (sorts: SortOption[]) => {
      const params = new URLSearchParams(searchParams.toString());
      // Remove sort param if empty, otherwise set it
      if (sorts.length === 0) {
        params.delete("sort");
      } else {
        params.set("sort", serializeSorts(sorts));
      }
      // Preserve extra params
      if (extraParams) {
        for (const [key, val] of Object.entries(extraParams)) {
          if (key === "sort") continue;
          if (val) params.set(key, val);
          else params.delete(key);
        }
      }
      const qs = params.toString();
      router.push(`${pathname}${qs ? `?${qs}` : ""}`);
    },
    [router, pathname, searchParams, extraParams],
  );

  const addSort = (field: SortField) => {
    // Default direction: priority = desc (highest first), dates = asc (soonest first), points = desc
    const defaultDir: SortDirection =
      field === "dueDate" || field === "startDate" ? "asc" : "desc";
    const newSorts = [...currentSorts, { field, direction: defaultDir }];
    navigate(newSorts);
    setMenuOpen(false);
  };

  const removeSort = (index: number) => {
    const newSorts = currentSorts.filter((_, i) => i !== index);
    navigate(newSorts);
  };

  const toggleDirection = (index: number) => {
    const newSorts = currentSorts.map((s, i) =>
      i === index
        ? { ...s, direction: (s.direction === "asc" ? "desc" : "asc") as SortDirection }
        : s,
    );
    navigate(newSorts);
  };

  const clearAll = () => {
    navigate([]);
  };

  // Fields already used
  const usedFields = new Set(currentSorts.map((s) => s.field));
  const availableFields = SORT_FIELDS.filter((f) => !usedFields.has(f));

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Active sort chips */}
      {currentSorts.map((sort, index) => (
        <span
          key={sort.field}
          className="flex items-center gap-1 rounded-md border border-accent/30 bg-accent/5 px-2 py-1 text-[11px] font-medium text-fg-primary"
        >
          <button
            onClick={() => toggleDirection(index)}
            className="flex items-center gap-1 hover:text-accent transition-colors"
            title={`Sort ${SORT_DIRECTION_LABELS[sort.direction === "asc" ? "desc" : "asc"]}`}
          >
            {sort.direction === "asc" ? (
              <ArrowUp size={10} className="text-accent" />
            ) : (
              <ArrowDown size={10} className="text-accent" />
            )}
            {SORT_FIELD_LABELS[sort.field]}
          </button>
          <button
            onClick={() => removeSort(index)}
            className="ml-0.5 rounded-sm hover:bg-accent/10 p-0.5 transition-colors"
            title="Remove sort"
          >
            <X size={8} />
          </button>
        </span>
      ))}

      {/* Add sort button */}
      {availableFields.length > 0 && (
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className={`flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-[11px] transition-colors focus:outline-none ${
              currentSorts.length > 0
                ? "border-border bg-bg-primary text-fg-muted hover:text-fg-secondary"
                : "border-border bg-bg-primary text-fg-muted hover:border-accent/30 hover:text-fg-secondary"
            }`}
          >
            {currentSorts.length === 0 ? (
              <>
                <ArrowUpDown size={10} />
                Sort
              </>
            ) : (
              <>
                <Plus size={10} />
                Add
              </>
            )}
            <ChevronDown
              size={9}
              className={`transition-transform ${menuOpen ? "rotate-180" : ""}`}
            />
          </button>

          {menuOpen && (
            <div className="absolute left-0 top-full z-50 mt-1 min-w-[160px] rounded-md border border-border bg-bg-elevated shadow-lg">
              {availableFields.map((field) => (
                <button
                  key={field}
                  type="button"
                  onClick={() => addSort(field)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] text-fg-secondary transition-colors hover:bg-bg-secondary"
                >
                  <ArrowUpDown size={10} className="text-fg-muted" />
                  {SORT_FIELD_LABELS[field]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Clear all */}
      {currentSorts.length > 0 && (
        <button
          onClick={clearAll}
          className="text-[11px] text-accent hover:text-accent-emphasis transition-colors"
        >
          Clear sort
        </button>
      )}
    </div>
  );
}
