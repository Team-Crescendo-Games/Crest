"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

interface Props {
  workspaceId: string;
  showClosed: boolean;
  closedCount: number;
}

export function SprintExtras({ showClosed, closedCount }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function navigate(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    for (const [key, val] of Object.entries(overrides)) {
      if (val) {
        params.set(key, val);
      } else {
        params.delete(key);
      }
    }
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`);
  }

  if (closedCount === 0) return null;

  return (
    <button
      onClick={() => navigate({ showClosed: showClosed ? undefined : "true" })}
      className="shrink-0 rounded-md border border-border px-2 py-1.5 text-[11px] text-fg-muted transition-colors hover:text-fg-secondary"
    >
      {showClosed ? "Hide closed" : `Closed (${closedCount})`}
    </button>
  );
}
