"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Check, Pencil } from "lucide-react";

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
    <div className="relative">
      <div className="flex items-center gap-1.5">
        {current ? (
          <Link
            href={href}
            className="text-[11px] text-accent transition-colors hover:text-accent-emphasis"
          >
            {current.label}
          </Link>
        ) : (
          <span className="text-[11px] text-fg-muted">None</span>
        )}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="cursor-pointer flex items-center gap-1 text-[10px] text-fg-muted transition-colors hover:text-fg-secondary"
          title="Change board"
        >
          <Pencil size={9} />
        </button>
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 w-72 rounded-md border border-border bg-bg-elevated shadow-lg">
            <div className="max-h-48 overflow-y-auto p-1">
              {options.length === 0 && <p className="px-3 py-2 text-[11px] text-fg-muted">No boards</p>}
              {options.map((o) => {
                const isSelected = o.value === value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    className="cursor-pointer flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-bg-secondary"
                  >
                    <div
                      className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border ${
                        isSelected ? "border-accent bg-accent" : "border-border"
                      }`}
                    >
                      {isSelected && <Check size={9} className="text-bg-primary" />}
                    </div>
                    <span className={isSelected ? "font-medium text-fg-primary" : "text-fg-secondary"}>
                      {o.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
