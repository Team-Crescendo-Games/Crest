"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Check } from "lucide-react";

export function DropdownPicker({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; color?: string }[];
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value) ?? options[0];
  const color = current.color;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex cursor-pointer items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors"
        style={color ? { backgroundColor: color + "20", color } : undefined}
      >
        {color && <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />}
        {current.label}
        <ChevronDown size={9} className={open ? "rotate-180" : ""} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 max-h-48 w-44 overflow-y-auto rounded-md border border-border bg-bg-elevated shadow-lg">
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-bg-secondary"
              >
                {o.color && <div className="h-2 w-2 rounded-full" style={{ backgroundColor: o.color }} />}
                <span
                  className={o.value === value ? "font-medium" : ""}
                  style={o.color ? { color: o.color } : undefined}
                >
                  {o.label}
                </span>
                {o.value === value && <Check size={11} className="ml-auto text-accent" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function BoardField({
  value,
  onChange,
  options,
  href,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  href: string;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value) ?? options[0];

  return (
    <div className="relative flex items-center gap-1">
      <Link href={href} className="text-[11px] text-accent transition-colors hover:text-accent-emphasis">
        {current.label}
      </Link>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="shrink-0 rounded p-0.5 text-fg-muted transition-colors hover:bg-bg-secondary hover:text-fg-secondary"
        title="Change board"
      >
        <ChevronDown size={10} className={open ? "rotate-180" : ""} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 max-h-48 w-44 overflow-y-auto rounded-md border border-border bg-bg-elevated shadow-lg">
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-bg-secondary"
              >
                <span className={o.value === value ? "font-medium text-accent" : "text-fg-primary"}>{o.label}</span>
                {o.value === value && <Check size={11} className="ml-auto text-accent" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
