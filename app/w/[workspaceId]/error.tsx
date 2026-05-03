"use client";

import { useEffect } from "react";
import Link from "next/link";

interface Props {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}

export default function WorkspaceError({ error, unstable_retry }: Props) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="rounded-md border border-border bg-bg-elevated p-8 text-center">
        <p className="font-mono text-sm font-medium text-fg-primary">Something went wrong</p>
        {error.digest && <p className="mt-1 font-mono text-xs text-fg-muted">ref: {error.digest}</p>}
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            onClick={unstable_retry}
            className="rounded-md bg-accent px-4 py-1.5 font-mono text-xs text-bg-primary hover:bg-accent-emphasis"
          >
            Try again
          </button>
          <Link
            href="/w"
            className="rounded-md border border-border px-4 py-1.5 font-mono text-xs text-fg-muted hover:text-fg-primary"
          >
            Back to workspaces
          </Link>
        </div>
      </div>
    </div>
  );
}
