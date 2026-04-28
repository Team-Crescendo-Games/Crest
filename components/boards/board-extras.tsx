"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

interface Props {
  workspaceId: string;
  boards: { id: string; name: string }[];
  currentBoard?: string;
  showArchived: boolean;
  archivedCount: number;
}

export function BoardExtras({
  boards,
  currentBoard,
  showArchived,
  archivedCount,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function navigate(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    // Reset page when board/archived filter changes
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

  return (
    <>
      <select
        value={currentBoard ?? ""}
        onChange={(e) => navigate({ board: e.target.value || undefined })}
        className="rounded-md border border-border bg-bg-primary px-2 py-1.5 font-mono text-[11px] text-fg-primary transition-colors focus:border-accent focus:outline-none"
      >
        <option value="">All boards</option>
        {boards.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>

      {archivedCount > 0 && (
        <button
          onClick={() =>
            navigate({
              showArchived: showArchived ? undefined : "true",
            })
          }
          className="shrink-0 rounded-md border border-border px-2 py-1.5 text-[11px] text-fg-muted transition-colors hover:text-fg-secondary"
        >
          {showArchived ? "Hide archived" : `Archived (${archivedCount})`}
        </button>
      )}
    </>
  );
}
