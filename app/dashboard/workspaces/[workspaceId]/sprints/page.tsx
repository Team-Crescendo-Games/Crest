import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Timer } from "lucide-react";
import { SprintRow } from "./sprint-row";

export default async function SprintsPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<{ showClosed?: string }>;
}) {
  const { workspaceId } = await params;
  const { showClosed } = await searchParams;
  const session = await auth();
  const userId = session!.user!.id!;

  const membership = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
    include: { role: true },
  });

  if (!membership) notFound();

  const includeClosed = showClosed === "true";

  const sprints = await prisma.sprint.findMany({
    where: {
      workspaceId,
      ...(includeClosed ? {} : { isActive: true }),
    },
    orderBy: { createdAt: "desc" },
    include: {
      tasks: {
        orderBy: { createdAt: "desc" },
        include: {
          author: { select: { name: true } },
          assignees: { select: { id: true, name: true, image: true } },
          tags: { select: { name: true, color: true } },
          board: { select: { name: true } },
        },
      },
      _count: { select: { tasks: true } },
    },
  });

  const closedCount = await prisma.sprint.count({
    where: { workspaceId, isActive: false },
  });

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href={`/dashboard/workspaces/${workspaceId}`}
        className="mb-6 inline-flex items-center gap-1.5 text-xs text-fg-muted transition-colors hover:text-fg-secondary"
      >
        <ArrowLeft size={12} />
        Back to workspace
      </Link>

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Timer size={16} className="text-accent" />
          <h1 className="font-mono text-lg font-semibold text-fg-primary">
            Sprints
          </h1>
        </div>
        <Link
          href={`/dashboard/workspaces/${workspaceId}/sprints/new`}
          className="flex items-center gap-1 rounded-md bg-accent/10 px-2.5 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
        >
          <Plus size={11} />
          New Sprint
        </Link>
      </div>

      {/* Filters */}
      <div className="mt-4 flex items-center gap-3">
        {closedCount > 0 && (
          <Link
            href={`/dashboard/workspaces/${workspaceId}/sprints${
              includeClosed ? "" : "?showClosed=true"
            }`}
            className="rounded-md border border-border px-2.5 py-1.5 text-xs text-fg-muted transition-colors hover:text-fg-secondary"
          >
            {includeClosed ? "Hide closed" : `Show closed (${closedCount})`}
          </Link>
        )}
      </div>

      {/* Sprint rows */}
      <div className="mt-6">
        {sprints.length === 0 ? (
          <p className="mt-8 text-center text-xs text-fg-muted">
            No sprints yet.
          </p>
        ) : (
          <div className="space-y-4">
            {sprints.map((sprint) => (
              <SprintRow
                key={sprint.id}
                sprint={sprint}
                workspaceId={workspaceId}
                permissions={membership.role.permissions}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
