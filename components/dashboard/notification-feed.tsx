"use client";

import { useState, useTransition } from "react";
import { Bell, Check } from "lucide-react";

interface NotificationItem {
  id: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  task: {
    id: string;
    title: string;
    board: { id: string; workspaceId: string };
  } | null;
}

interface NotificationFeedProps {
  initial: NotificationItem[];
  totalCount: number;
}

const PAGE_SIZE = 10;

export function NotificationFeed({ initial, totalCount }: NotificationFeedProps) {
  const [items, setItems] = useState(initial);
  const [skip, setSkip] = useState(initial.length);
  const [hasMore, setHasMore] = useState(initial.length < totalCount);
  const [isPending, startTransition] = useTransition();

  function loadMore() {
    startTransition(async () => {
      const res = await fetch(`/api/notifications?skip=${skip}&take=${PAGE_SIZE}`);
      const data: { notifications: NotificationItem[]; total: number } = await res.json();
      setItems((prev) => [...prev, ...data.notifications]);
      const newSkip = skip + data.notifications.length;
      setSkip(newSkip);
      setHasMore(newSkip < data.total);
    });
  }

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  }

  async function markAllRead() {
    await fetch("/api/notifications/read-all", { method: "PATCH" });
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  const hasUnread = items.some((n) => !n.isRead);

  if (items.length === 0) {
    return <p className="py-6 text-center text-xs text-fg-muted">No notifications yet.</p>;
  }

  return (
    <div>
      {hasUnread && (
        <div className="mb-2 flex justify-end">
          <button
            onClick={markAllRead}
            className="flex items-center gap-1 text-[11px] text-fg-muted transition-colors hover:text-accent"
          >
            <Check size={11} />
            Mark all as read
          </button>
        </div>
      )}
      <ul className="space-y-1.5">
        {items.map((n) => (
          <li
            key={n.id}
            className={`group flex items-start gap-2.5 rounded-md border px-3 py-2.5 transition-colors ${
              n.isRead ? "border-border bg-bg-elevated/40" : "border-accent-subtle/30 bg-accent/5"
            }`}
          >
            <Bell size={12} className={`mt-0.5 shrink-0 ${n.isRead ? "text-fg-muted" : "text-accent"}`} />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-fg-secondary">{n.message}</p>
              {n.task && (
                <a
                  href={`/w/${n.task.board.workspaceId}/b/${n.task.board.id}/t/${n.task.id}`}
                  className="mt-0.5 block font-mono text-[11px] text-accent hover:text-accent-emphasis"
                >
                  → {n.task.title}
                </a>
              )}
              <p className="mt-0.5 text-[11px] text-fg-muted">
                {new Date(n.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            {!n.isRead && (
              <button
                onClick={() => markRead(n.id)}
                className="shrink-0 rounded p-0.5 text-fg-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-accent"
                title="Mark as read"
              >
                <Check size={11} />
              </button>
            )}
          </li>
        ))}
      </ul>

      {hasMore && (
        <button
          onClick={loadMore}
          disabled={isPending}
          className="mt-3 w-full rounded-md border border-border py-2 text-xs text-fg-muted transition-colors hover:border-accent/30 hover:text-fg-secondary disabled:opacity-50"
        >
          {isPending ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}
