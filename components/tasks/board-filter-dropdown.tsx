"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface Props {
  boards: { id: string; name: string }[];
  currentBoards: string[];
}

export function BoardFilterDropdown({ boards, currentBoards }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
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

  function toggle(boardId: string) {
    const next = currentBoards.includes(boardId)
      ? currentBoards.filter((id) => id !== boardId)
      : [...currentBoards, boardId];

    const params = new URLSearchParams(searchParams.toString());
    if (next.length > 0) {
      params.set("board", next.join(","));
    } else {
      params.delete("board");
    }
    params.delete("page");
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`);
  }

  if (boards.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1.5 font-mono text-[11px] transition-all focus:outline-none hover:border-accent/40 hover:bg-accent/5 ${
          currentBoards.length > 0
            ? "border-accent/40 bg-accent/5 text-fg-primary"
            : "border-border bg-bg-primary text-fg-muted"
        }`}
      >
        {currentBoards.length > 0
          ? currentBoards.length === 1
            ? boards.find((b) => b.id === currentBoards[0])?.name ?? "Board"
            : `${currentBoards.length} boards`
          : "Board"}
        <ChevronDown size={10} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[180px] max-h-[240px] overflow-y-auto rounded-md border border-border bg-bg-elevated shadow-lg">
          {boards.map((board) => {
            const isSelected = currentBoards.includes(board.id);
            return (
              <button
                key={board.id}
                type="button"
                onClick={() => toggle(board.id)}
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
                <span className="flex h-5 w-5 items-center justify-center rounded bg-bg-secondary text-[10px] font-medium text-fg-muted">
                  B
                </span>
                {board.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
