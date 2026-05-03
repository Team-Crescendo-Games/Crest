"use client";

import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import { Check, Pencil } from "lucide-react";

const ReactMarkdown = lazy(() => import("react-markdown"));

export const URL_RE = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/g;

export function linkifyChildren(children: React.ReactNode): React.ReactNode {
  return Array.isArray(children)
    ? children.map((child, i) => <React.Fragment key={i}>{linkifyNode(child)}</React.Fragment>)
    : linkifyNode(children);
}

export function linkifyNode(node: React.ReactNode): React.ReactNode {
  if (typeof node !== "string") return node;
  const parts = node.split(URL_RE);
  if (parts.length === 1) return node;
  return parts.map((part, i) =>
    URL_RE.test(part) ? (
      <a
        key={i}
        href={part.startsWith("http") ? part : `https://${part}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-accent underline underline-offset-2 hover:text-accent-emphasis"
      >
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export function DescriptionField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startH = useRef(0);

  const minHeight = 96;

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      dragging.current = true;
      startY.current = e.clientY;
      const el = editing ? textareaRef.current : viewRef.current;
      startH.current = el?.getBoundingClientRect().height ?? minHeight;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [editing, minHeight],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      const delta = e.clientY - startY.current;
      setHeight(Math.max(minHeight, startH.current + delta));
    },
    [minHeight],
  );

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  const dragHandle = (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className="group flex cursor-row-resize items-center justify-center py-1"
    >
      <div className="h-0.5 w-8 rounded-full bg-transparent transition-colors group-hover:bg-border" />
    </div>
  );

  if (!editing) {
    return (
      <div className="group/desc relative min-w-0">
        <div
          ref={viewRef}
          className="prose-description overflow-y-auto overflow-hidden wrap-break-words rounded-md border border-border bg-bg-primary px-3 py-2 font-mono text-sm text-fg-primary"
          style={{ minHeight, height: height ?? undefined }}
        >
          {value ? (
            <Suspense fallback={<div className="animate-pulse text-fg-muted text-sm">Loading…</div>}>
              <ReactMarkdown
                components={{
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent underline underline-offset-2 hover:text-accent-emphasis"
                    >
                      {children}
                    </a>
                  ),
                  p: ({ children }) => <p>{linkifyChildren(children)}</p>,
                  li: ({ children }) => <li>{linkifyChildren(children)}</li>,
                }}
              >
                {value}
              </ReactMarkdown>
            </Suspense>
          ) : (
            <span className="text-fg-muted">No description</span>
          )}
        </div>
        {dragHandle}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="absolute right-2 top-2 cursor-pointer rounded-md border border-border bg-bg-secondary p-1 text-fg-muted opacity-0 transition-opacity hover:text-fg-primary group-hover/desc:opacity-100"
          title="Edit description"
        >
          <Pencil size={12} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative min-w-0">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="block w-full resize-none rounded-md border border-accent bg-bg-primary px-3 py-2 font-mono text-sm text-fg-primary placeholder-fg-muted transition-colors outline-none ring-1 ring-accent/50"
        placeholder="Add a description..."
        style={{ minHeight, height: height ?? undefined }}
      />
      {dragHandle}
      <button
        type="button"
        onClick={() => setEditing(false)}
        className="absolute right-2 top-2 cursor-pointer rounded-md border border-border bg-bg-secondary p-1 text-fg-muted transition-colors hover:text-fg-primary"
        title="Done editing"
      >
        <Check size={12} />
      </button>
    </div>
  );
}
