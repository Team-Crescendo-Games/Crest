"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";

export function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
  className = "",
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={`rounded-md border border-border bg-bg-elevated/60 backdrop-blur-sm ${className}`}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-1.5 px-4 py-3 text-left"
      >
        <ChevronRight
          size={12}
          className={`text-fg-muted transition-transform ${open ? "rotate-90" : ""}`}
        />
        <span className="text-xs font-medium text-fg-secondary">{title}</span>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
