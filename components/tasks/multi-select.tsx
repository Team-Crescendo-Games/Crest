"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, X } from "lucide-react";

export interface MultiSelectOption {
  value: string;
  label: string;
  node: React.ReactNode;
}

export function MultiSelect({
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
    const next = selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value];
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
        <ChevronDown size={10} className={`transition-transform ${open ? "rotate-180" : ""}`} />
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
                    isSelected ? "border-accent bg-accent text-white" : "border-border"
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

export function FilterChip({
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
      {!color && !avatar && <span className="text-accent" />}
      {avatar}
      {color && <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />}
      <span className={color ? "" : "text-accent"}>{label}</span>
      <button onClick={onRemove} className="cursor-pointer transition-opacity hover:opacity-70">
        <X size={9} />
      </button>
    </span>
  );
}
