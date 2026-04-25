"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Sun, Moon } from "lucide-react";

const emptySubscribe = () => () => {};

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (!mounted) {
    return (
      <button
        className="flex h-7 w-7 items-center justify-center rounded border border-border text-fg-muted"
        aria-label="Toggle theme"
      >
        <span className="h-3.5 w-3.5" />
      </button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex h-7 w-7 items-center justify-center rounded border border-border text-fg-muted transition-colors hover:border-accent-mid hover:text-accent-mid"
      aria-label="Toggle theme"
    >
      {isDark ? <Sun size={14} /> : <Moon size={14} />}
    </button>
  );
}
