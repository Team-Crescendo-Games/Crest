"use client";

import { useActionState } from "react";
import { handleApplication } from "@/lib/actions/workspace";
import { Check, X } from "lucide-react";

interface Application {
  id: string;
  message: string | null;
  createdAt: Date;
  user: { id: string; name: string | null; email: string | null };
}

export function ApplicationList({
  applications,
}: {
  applications: Application[];
}) {
  return (
    <div className="space-y-2">
      {applications.map((app) => (
        <ApplicationRow key={app.id} application={app} />
      ))}
    </div>
  );
}

function ApplicationRow({ application }: { application: Application }) {
  const [, approveAction, approvePending] = useActionState(
    handleApplication,
    null,
  );
  const [, rejectAction, rejectPending] = useActionState(
    handleApplication,
    null,
  );

  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-bg-elevated/60 px-4 py-3 backdrop-blur-sm">
      <div>
        <p className="text-xs font-medium text-fg-primary">
          {application.user.name ?? application.user.email}
        </p>
        {application.message && (
          <p className="mt-0.5 text-[11px] text-fg-muted italic">
            &ldquo;{application.message}&rdquo;
          </p>
        )}
        <p className="mt-0.5 text-[11px] text-fg-muted">
          Applied {new Date(application.createdAt).toLocaleDateString()}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <form action={approveAction}>
          <input type="hidden" name="applicationId" value={application.id} />
          <input type="hidden" name="action" value="approve" />
          <button
            type="submit"
            disabled={approvePending || rejectPending}
            className="rounded-md bg-accent/10 p-1.5 text-accent transition-colors hover:bg-accent/20 disabled:opacity-50"
            title="Approve"
          >
            <Check size={12} />
          </button>
        </form>
        <form action={rejectAction}>
          <input type="hidden" name="applicationId" value={application.id} />
          <input type="hidden" name="action" value="reject" />
          <button
            type="submit"
            disabled={approvePending || rejectPending}
            className="rounded-md bg-bg-secondary p-1.5 text-fg-muted transition-colors hover:text-accent-emphasis disabled:opacity-50"
            title="Reject"
          >
            <X size={12} />
          </button>
        </form>
      </div>
    </div>
  );
}
