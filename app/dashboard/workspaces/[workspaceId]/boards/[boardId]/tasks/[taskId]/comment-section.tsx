"use client";

import { useActionState } from "react";
import { addComment, deleteComment } from "@/lib/actions/task";
import { MessageSquare, Trash2 } from "lucide-react";
import { useRef } from "react";

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
  const formRef = useRef<HTMLFormElement>(null);
  const [addState, addAction, addPending] = useActionState(
    async (prev: unknown, formData: FormData) => {
      const result = await addComment(prev, formData);
      if (result?.success) formRef.current?.reset();
      return result;
    },
    null,
  );

  return (
    <div>
      <h3 className="flex items-center gap-2 font-mono text-xs font-medium text-fg-secondary">
        <MessageSquare size={13} className="text-accent" />
        Comments
        <span className="text-[11px] text-fg-muted">({comments.length})</span>
      </h3>

      {/* Comment list */}
      <div className="mt-3 space-y-3">
        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            isOwn={comment.userId === currentUserId}
          />
        ))}

        {comments.length === 0 && (
          <p className="text-[11px] text-fg-muted">No comments yet.</p>
        )}
      </div>

      {/* Add comment */}
      <form ref={formRef} action={addAction} className="mt-4">
        <input type="hidden" name="taskId" value={taskId} />

        {addState?.error && (
          <p className="mb-2 text-[11px] text-accent-emphasis">
            {addState.error}
          </p>
        )}

        <div className="flex gap-2">
          <textarea
            name="text"
            required
            rows={2}
            className="flex-1 resize-none rounded-md border border-border bg-bg-primary px-3 py-2 font-mono text-xs text-fg-primary placeholder-fg-muted transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/50"
            placeholder="Write a comment..."
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
  );
}

function CommentItem({ comment, isOwn }: { comment: Comment; isOwn: boolean }) {
  const [, deleteAction, deletePending] = useActionState(deleteComment, null);

  return (
    <div className="rounded-md border border-border bg-bg-elevated/60 p-3 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/10 text-[9px] font-bold text-accent">
            {comment.userName?.charAt(0)?.toUpperCase() ?? "?"}
          </div>
          <span className="text-[11px] font-medium text-fg-primary">
            {comment.userName}
          </span>
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
      <p className="mt-1.5 whitespace-pre-wrap text-xs text-fg-secondary">
        {comment.text}
      </p>
    </div>
  );
}
