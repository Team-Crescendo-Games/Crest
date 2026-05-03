"use client";

import { useActionState, useRef, useState } from "react";
import { addComment, deleteComment } from "@/lib/actions/task";
import { ChevronDown, MessageSquare, Trash2 } from "lucide-react";

interface Comment {
  id: string;
  text: string;
  createdAt: Date;
  userId: string;
  userName: string | null;
}

export function CommentSection({
  taskId,
  comments,
  currentUserId,
}: {
  taskId: string;
  comments: Comment[];
  currentUserId: string;
}) {
  const [expanded, setExpanded] = useState(true);
  const formRef = useRef<HTMLFormElement>(null);
  const [addState, addAction, addPending] = useActionState(async (prev: unknown, formData: FormData) => {
    const result = await addComment(prev, formData);
    if (result?.success) formRef.current?.reset();
    return result;
  }, null);

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls={`comments-${taskId}`}
        className="group flex w-full items-center gap-2 font-mono text-xs font-medium text-fg-secondary transition-colors hover:text-fg-primary"
      >
        <ChevronDown size={13} className={`text-fg-muted transition-transform ${expanded ? "" : "-rotate-90"}`} />
        <MessageSquare size={13} className="text-accent" />
        Comments
        <span className="text-[11px] text-fg-muted">({comments.length})</span>
      </button>

      {expanded && (
        <div id={`comments-${taskId}`}>
          {/* Comment list */}
          <div className="mt-3 space-y-3">
            {comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} isOwn={comment.userId === currentUserId} />
            ))}

            {comments.length === 0 && <p className="text-[11px] text-fg-muted">No comments yet.</p>}
          </div>

          {/* Add comment */}
          <form ref={formRef} action={addAction} className="mt-4">
            <input type="hidden" name="taskId" value={taskId} />

            {addState?.error && <p className="mb-2 text-[11px] text-accent-emphasis">{addState.error}</p>}

            <div className="flex gap-2">
              <textarea
                name="text"
                required
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    // Cmd/Ctrl+Enter inserts a newline
                    e.preventDefault();
                    const target = e.currentTarget;
                    const { selectionStart, selectionEnd } = target;
                    target.value = target.value.slice(0, selectionStart) + "\n" + target.value.slice(selectionEnd);
                    target.selectionStart = target.selectionEnd = selectionStart + 1;
                  } else if (e.key === "Enter" && !e.shiftKey) {
                    // Enter submits the form
                    e.preventDefault();
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
                className="flex-1 resize-none rounded-md border border-border bg-bg-primary px-3 py-2 font-mono text-xs text-fg-primary placeholder-fg-muted transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/50"
                placeholder="Write a comment"
              />
              <button
                type="submit"
                disabled={addPending}
                className="self-end rounded-md bg-accent px-3 py-2 text-xs font-medium text-bg-primary transition-all hover:bg-accent-emphasis disabled:opacity-50"
              >
                {addPending ? "..." : "Post"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function CommentItem({ comment, isOwn }: { comment: Comment; isOwn: boolean }) {
  const [, deleteAction, deletePending] = useActionState(deleteComment, null);

  return (
    <div className="rounded-md border border-border bg-bg-elevated/60 p-3 backdrop-blur-sm overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/10 text-[9px] font-bold text-accent">
            {comment.userName?.charAt(0)?.toUpperCase() ?? "?"}
          </div>
          <span className="text-[11px] font-medium text-fg-primary">{comment.userName}</span>
          <span className="text-[10px] text-fg-muted">
            {new Date(comment.createdAt).toLocaleDateString()}{" "}
            {new Date(comment.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        {isOwn && (
          <form action={deleteAction}>
            <input type="hidden" name="commentId" value={comment.id} />
            <button
              type="submit"
              disabled={deletePending}
              className="text-fg-muted transition-colors hover:text-accent-emphasis disabled:opacity-50"
              title="Delete comment"
            >
              <Trash2 size={10} />
            </button>
          </form>
        )}
      </div>
      <p className="mt-1.5 whitespace-pre-wrap wrap-break-words text-xs text-fg-secondary">
        <Linkify text={comment.text} />
      </p>
    </div>
  );
}

const URL_REGEX = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/g;

function Linkify({ text }: { text: string }) {
  const parts = text.split(URL_REGEX);
  return (
    <>
      {parts.map((part, i) =>
        URL_REGEX.test(part) ? (
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
      )}
    </>
  );
}
