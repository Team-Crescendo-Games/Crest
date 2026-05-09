"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, ChevronRight, LayoutList, Eye, EyeOff } from "lucide-react";

interface Board {
  id: string;
  name: string;
  isActive: boolean;
}

interface BoardNavProps {
  boards: Board[];
  activeWorkspaceId: string;
  pathname: string;
}

export function BoardNav({ boards, activeWorkspaceId, pathname }: BoardNavProps) {
  const [expanded, setExpanded] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  const boardsHref = `/w/${activeWorkspaceId}/b`;
  const boardsActive = pathname.includes("/b");
  const childBoardActive = boards.some((b) => pathname.startsWith(`/w/${activeWorkspaceId}/b/${b.id}`));

  return (
    <div>
      <div
        className={`flex items-center rounded-md transition-colors ${
          boardsActive ? (childBoardActive ? "bg-accent/5" : "bg-accent/10") : "hover:bg-bg-secondary"
        }`}
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className="shrink-0 rounded p-0.5 text-fg-muted hover:text-fg-secondary"
        >
          {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        </button>
        <Link
          href={boardsHref}
          className={`flex flex-1 items-center gap-2 px-2 py-1.5 text-xs font-medium transition-colors ${
            boardsActive ? "text-accent" : "text-fg-secondary hover:text-fg-primary"
          }`}
        >
          <LayoutList size={13} />
          Boards
        </Link>
        <button
          onClick={() => setShowArchived(!showArchived)}
          className={`shrink-0 rounded p-0.5 mr-1 transition-colors ${
            showArchived ? "text-accent hover:text-accent-emphasis" : "text-fg-muted hover:text-fg-secondary"
          }`}
          title={showArchived ? "Hide archived boards" : "Show archived boards"}
        >
          {showArchived ? <Eye size={11} /> : <EyeOff size={11} />}
        </button>
      </div>

      {expanded && boards.filter((b) => showArchived || b.isActive).length > 0 && (
        <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border-subtle pl-2">
          {boards
            .filter((b) => showArchived || b.isActive)
            .map((board) => {
              const boardHref = `/w/${activeWorkspaceId}/b/${board.id}`;
              const isBoardActive = pathname.startsWith(boardHref);
              return (
                <Link
                  key={board.id}
                  href={boardHref}
                  className={`flex items-center gap-1.5 truncate rounded-md px-2 py-1 text-xs transition-colors ${
                    isBoardActive
                      ? "bg-accent/10 text-accent"
                      : "text-fg-muted hover:bg-bg-secondary/40 hover:text-fg-secondary"
                  } ${!board.isActive ? "italic opacity-60" : ""}`}
                >
                  {board.name}
                  {!board.isActive && <span className="text-[8px] text-fg-muted">(archived)</span>}
                </Link>
              );
            })}
        </div>
      )}
    </div>
  );
}
