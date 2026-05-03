"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, ChevronRight, Timer, Eye, EyeOff } from "lucide-react";

interface Sprint {
  id: string;
  title: string;
  isActive: boolean;
}

interface SprintNavProps {
  sprints: Sprint[];
  activeWorkspaceId: string;
  pathname: string;
}

export function SprintNav({
  sprints,
  activeWorkspaceId,
  pathname,
}: SprintNavProps) {
  const [expanded, setExpanded] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  const sprintsActive = pathname.startsWith(`/w/${activeWorkspaceId}/s`);
  const childSprintActive = sprints.some((s) =>
    pathname.startsWith(`/w/${activeWorkspaceId}/s/${s.id}`),
  );

  return (
    <div>
      <div
        className={`flex items-center rounded-md transition-colors ${
          sprintsActive
            ? childSprintActive
              ? "bg-accent/5"
              : "bg-accent/10"
            : "hover:bg-bg-secondary"
        }`}
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className="shrink-0 rounded p-0.5 text-fg-muted hover:text-fg-secondary"
        >
          {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        </button>
        <Link
          href={`/w/${activeWorkspaceId}/s`}
          className={`flex flex-1 items-center gap-2 px-2 py-1.5 text-xs font-medium transition-colors ${
            sprintsActive
              ? "text-accent"
              : "text-fg-secondary hover:text-fg-primary"
          }`}
        >
          <Timer size={13} />
          Sprints
        </Link>
        <button
          onClick={() => setShowArchived(!showArchived)}
          className={`shrink-0 rounded p-0.5 mr-1 transition-colors ${
            showArchived
              ? "text-accent hover:text-accent-emphasis"
              : "text-fg-muted hover:text-fg-secondary"
          }`}
          title={
            showArchived ? "Hide archived sprints" : "Show archived sprints"
          }
        >
          {showArchived ? <Eye size={11} /> : <EyeOff size={11} />}
        </button>
      </div>

      {expanded &&
        sprints.filter((s) => showArchived || s.isActive).length > 0 && (
          <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border-subtle pl-2">
            {sprints
              .filter((s) => showArchived || s.isActive)
              .map((sprint) => {
                const sprintHref = `/w/${activeWorkspaceId}/s/${sprint.id}`;
                const isSprintActive = pathname.startsWith(sprintHref);
                return (
                  <Link
                    key={sprint.id}
                    href={sprintHref}
                    className={`flex items-center gap-1.5 truncate rounded-md px-2 py-1 text-xs transition-colors ${
                      isSprintActive
                        ? "bg-accent/10 text-accent"
                        : "text-fg-muted hover:bg-bg-secondary/40 hover:text-fg-secondary"
                    } ${!sprint.isActive ? "italic opacity-60" : ""}`}
                  >
                    {sprint.title}
                    {!sprint.isActive && (
                      <span className="text-[8px] text-fg-muted">
                        (archived)
                      </span>
                    )}
                  </Link>
                );
              })}
          </div>
        )}
    </div>
  );
}
