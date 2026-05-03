"use client";

interface Props {
  label: string;
  children: React.ReactNode;
  position?: "top" | "bottom";
  variant?: "default" | "danger";
}

export function Tooltip({ label, children, position = "bottom", variant = "default" }: Props) {
  const posClass = position === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5";

  const colorClass =
    variant === "danger"
      ? "bg-red-500/10 text-red-400 border-red-500/20"
      : "bg-bg-elevated text-fg-secondary border-border";

  return (
    <div className="group/tip relative inline-flex items-center">
      {children}
      <div
        className={`pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded px-2 py-1 text-[10px] font-medium opacity-0 shadow-md border transition-opacity group-hover/tip:opacity-100 ${posClass} ${colorClass}`}
      >
        {label}
      </div>
    </div>
  );
}
