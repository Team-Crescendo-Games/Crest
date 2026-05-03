"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="rounded-md border border-border bg-bg-elevated p-8 text-center">
        <p className="font-mono text-sm font-medium text-fg-primary">
          Something went wrong
        </p>
        {error.digest && (
          <p className="mt-1 font-mono text-xs text-fg-muted">
            ref: {error.digest}
          </p>
        )}
        <button
          onClick={unstable_retry}
          className="mt-4 rounded-md bg-accent px-4 py-1.5 font-mono text-xs text-bg-primary hover:bg-accent-emphasis"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
