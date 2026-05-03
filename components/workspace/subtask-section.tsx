"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import Link from "next/link";
import { Plus, X, Search, Loader2, ChevronRight } from "lucide-react";
import { addSubtask, removeSubtask, getAvailableSubtasks, getSubtasks } from "@/lib/actions/task";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/task-enums";
import type { TaskStatus } from "@/prisma/generated/prisma/enums";

interface Subtask {
  id: string;
  title: string;
  status: TaskStatus;
}

interface SearchResult {
  id: string;
  title: string;
  status: TaskStatus;
}

export function SubtaskSection({
  taskId,
  boardId,
  workspaceId,
  subtaskCount: initialCount,
}: {
  taskId: string;
  boardId: string;
  workspaceId: string;
  subtaskCount: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [count, setCount] = useState(() => initialCount);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Fetch subtasks when expanded for the first time
  useEffect(() => {
    if (!expanded || loaded) return;
    let cancelled = false;
    async function fetchSubtasks() {
      setLoading(true);
      try {
        const data = await getSubtasks(taskId);
        if (!cancelled) {
          setSubtasks(data);
          setCount(data.length);
          setLoaded(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchSubtasks();
    return () => {
      cancelled = true;
    };
  }, [expanded, loaded, taskId]);

  // Focus input when opening the add panel
  useEffect(() => {
    if (isAdding) {
      inputRef.current?.focus();
    }
  }, [isAdding]);

  // Debounced search
  useEffect(() => {
    if (!isAdding) return;
    clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const tasks = await getAvailableSubtasks(boardId, taskId, query);
        const existingIds = new Set(subtasks.map((s) => s.id));
        setResults((tasks as SearchResult[]).filter((t) => !existingIds.has(t.id)));
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(debounceRef.current);
  }, [query, isAdding, boardId, taskId, subtasks]);

  function handleAdd(subtaskId: string) {
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("parentTaskId", taskId);
      formData.set("subtaskId", subtaskId);
      const result = await addSubtask(null, formData);
      if (result?.error) {
        setError(result.error);
        setTimeout(() => setError(null), 5000);
      } else {
        // Refresh the subtask list
        setLoaded(false);
      }
    });
  }

  function handleRemove(subtaskId: string) {
    setError(null);
    // Optimistic removal
    setSubtasks((prev) => prev.filter((s) => s.id !== subtaskId));
    setCount((c) => Math.max(0, c - 1));
    startTransition(async () => {
      const formData = new FormData();
      formData.set("parentTaskId", taskId);
      formData.set("subtaskId", subtaskId);
      const result = await removeSubtask(null, formData);
      if (result?.error) {
        setError(result.error);
        setTimeout(() => setError(null), 5000);
        // Revert on error — refetch
        setLoaded(false);
      }
    });
  }

  function handleToggleAdd() {
    if (!expanded) {
      setExpanded(true);
    }
    setIsAdding(!isAdding);
    setQuery("");
    setResults([]);
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex cursor-pointer items-center gap-1.5 font-mono text-xs font-medium text-fg-secondary transition-colors hover:text-fg-primary"
        >
          <ChevronRight size={12} className={`transition-transform ${expanded ? "rotate-90" : ""}`} />
          Subtasks
          <span className="ml-0.5 text-fg-muted">({count})</span>
        </button>
        <button
          onClick={handleToggleAdd}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-fg-muted transition-colors hover:bg-bg-secondary hover:text-fg-secondary"
        >
          {isAdding ? (
            <>
              <X size={11} />
              Cancel
            </>
          ) : (
            <>
              <Plus size={11} />
              Add
            </>
          )}
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mt-2 flex items-center justify-between rounded-md border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-400">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-2 shrink-0 rounded p-0.5 transition-colors hover:bg-red-400/20"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {expanded && (
        <>
          {/* Loading state */}
          {loading && (
            <div className="mt-2 flex items-center gap-2 py-3 text-xs text-fg-muted">
              <Loader2 size={12} className="animate-spin" />
              Loading subtasks…
            </div>
          )}

          {/* Existing subtasks */}
          {!loading && subtasks.length > 0 && (
            <div className="mt-2 space-y-1">
              {subtasks.map((sub) => (
                <div
                  key={sub.id}
                  className="group/sub flex items-center gap-2 rounded-md border border-border bg-bg-elevated/60 px-3 py-2 text-xs transition-colors hover:border-accent/30"
                >
                  <div
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor: STATUS_COLORS[sub.status] ?? "#9c9c98",
                    }}
                  />
                  <Link
                    href={`/w/${workspaceId}/b/${boardId}/t/${sub.id}`}
                    className="min-w-0 flex-1 truncate text-fg-primary transition-colors hover:text-accent"
                  >
                    {sub.title}
                  </Link>
                  <span className="shrink-0 text-[11px] text-fg-muted">{STATUS_LABELS[sub.status]}</span>
                  <button
                    onClick={() => handleRemove(sub.id)}
                    disabled={isPending}
                    className="shrink-0 rounded p-0.5 text-fg-muted opacity-0 transition-all hover:bg-bg-secondary hover:text-red-400 group-hover/sub:opacity-100 disabled:opacity-50"
                    title="Remove subtask"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {!loading && subtasks.length === 0 && !isAdding && (
            <p className="mt-2 text-[11px] text-fg-muted">No subtasks</p>
          )}
        </>
      )}

      {/* Add subtask search panel */}
      {isAdding && (
        <div className="mt-2 rounded-md border border-border bg-bg-elevated/80 p-2 backdrop-blur-sm">
          <div className="relative">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-fg-muted" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tasks on this board…"
              className="w-full rounded border border-border bg-bg-primary py-1.5 pl-7 pr-2 text-xs text-fg-primary placeholder:text-fg-muted focus:border-accent/40 focus:outline-none"
            />
            {isSearching && (
              <Loader2 size={12} className="absolute right-2 top-1/2 -translate-y-1/2 animate-spin text-fg-muted" />
            )}
          </div>

          <div className="mt-1.5 max-h-48 overflow-y-auto">
            {results.length === 0 && !isSearching && (
              <p className="py-3 text-center text-[11px] text-fg-muted">
                {query ? "No matching tasks found" : "Type to search for tasks"}
              </p>
            )}
            {results.map((task) => (
              <button
                key={task.id}
                onClick={() => handleAdd(task.id)}
                disabled={isPending}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-bg-secondary disabled:opacity-50"
              >
                <div
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{
                    backgroundColor: STATUS_COLORS[task.status] ?? "#9c9c98",
                  }}
                />
                <span className="min-w-0 flex-1 truncate text-fg-primary">{task.title}</span>
                <span className="shrink-0 text-[10px] text-fg-muted">{STATUS_LABELS[task.status]}</span>
                <Plus size={11} className="shrink-0 text-fg-muted" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
