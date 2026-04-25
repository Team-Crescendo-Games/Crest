import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, Globe, Lock, ShieldCheck } from "lucide-react";
import { JoinButton, ApplyButton } from "./join-buttons";

export default async function BrowseWorkspacesPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  // Get user's current memberships
  const myMembershipIds = new Set(
    (
      await prisma.workspaceMember.findMany({
        where: { userId },
        select: { workspaceId: true },
      })
    ).map((m) => m.workspaceId),
  );

  // Get user's pending applications
  const myApplicationIds = new Set(
    (
      await prisma.workspaceApplication.findMany({
        where: { userId, status: "PENDING" },
        select: { workspaceId: true },
      })
    ).map((a) => a.workspaceId),
  );

  // Get all discoverable workspaces (OPEN or APPLY_TO_JOIN)
  const discoverableWorkspaces = await prisma.workspace.findMany({
    where: {
      joinPolicy: { in: ["OPEN", "APPLY_TO_JOIN"] },
    },
    include: {
      _count: { select: { members: true } },
    },
    orderBy: { name: "asc" },
  });

  const joinable = discoverableWorkspaces.filter(
    (ws) => !myMembershipIds.has(ws.id),
  );
  const alreadyIn = discoverableWorkspaces.filter((ws) =>
    myMembershipIds.has(ws.id),
  );

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/dashboard/workspaces"
        className="mb-6 inline-flex items-center gap-1.5 text-xs text-fg-muted transition-colors hover:text-fg-secondary"
      >
        <ArrowLeft size={12} />
        Back to workspaces
      </Link>

      <h1 className="font-mono text-lg font-semibold text-fg-primary">
        Browse Workspaces
      </h1>
      <p className="mt-1 text-xs text-fg-muted">
        Discover workspaces you can join or apply to.
      </p>

      {/* Joinable workspaces */}
      {joinable.length > 0 && (
        <section className="mt-6">
          <h2 className="font-mono text-sm font-medium text-fg-primary">
            Available to Join
          </h2>
          <div className="mt-3 space-y-2">
            {joinable.map((ws) => (
              <div
                key={ws.id}
                className="flex items-center justify-between rounded-md border border-border bg-bg-elevated/60 px-4 py-3 backdrop-blur-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10">
                    {ws.joinPolicy === "OPEN" ? (
                      <Globe size={14} className="text-accent" />
                    ) : (
                      <ShieldCheck size={14} className="text-accent-subtle" />
                    )}
                  </div>
                  <div>
                    <p className="font-mono text-sm font-medium text-fg-primary">
                      {ws.name}
                    </p>
                    <p className="text-[11px] text-fg-muted">
                      {ws._count.members} member
                      {ws._count.members !== 1 && "s"}
                      {ws.description && ` · ${ws.description}`}
                    </p>
                  </div>
                </div>

                {ws.joinPolicy === "OPEN" ? (
                  <JoinButton workspaceId={ws.id} />
                ) : myApplicationIds.has(ws.id) ? (
                  <span className="rounded-full bg-bg-secondary px-2.5 py-1 text-[11px] font-medium text-fg-muted">
                    Applied
                  </span>
                ) : (
                  <ApplyButton workspaceId={ws.id} />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {joinable.length === 0 && (
        <div className="mt-12 text-center">
          <Lock size={20} className="mx-auto text-fg-muted" />
          <p className="mt-3 text-xs text-fg-muted">
            No workspaces are currently open for joining.
          </p>
        </div>
      )}

      {/* Already a member */}
      {alreadyIn.length > 0 && (
        <section className="mt-8">
          <h2 className="font-mono text-sm font-medium text-fg-secondary">
            Already a Member
          </h2>
          <div className="mt-3 space-y-2">
            {alreadyIn.map((ws) => (
              <Link
                key={ws.id}
                href={`/dashboard/workspaces/${ws.id}`}
                className="flex items-center gap-3 rounded-md border border-border bg-bg-elevated/60 px-4 py-3 backdrop-blur-sm transition-colors hover:border-accent/30"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10">
                  <Globe size={14} className="text-accent" />
                </div>
                <div>
                  <p className="font-mono text-sm font-medium text-fg-primary">
                    {ws.name}
                  </p>
                  <p className="text-[11px] text-fg-muted">
                    {ws._count.members} member
                    {ws._count.members !== 1 && "s"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
