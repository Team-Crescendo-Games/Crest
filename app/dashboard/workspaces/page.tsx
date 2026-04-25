import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, Search } from "lucide-react";

export default async function WorkspacesPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    include: {
      workspace: {
        include: {
          _count: { select: { members: true, boards: true } },
        },
      },
      role: true,
    },
    orderBy: { joinedAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-lg font-semibold text-fg-primary">
            Workspaces
          </h1>
          <p className="mt-1 text-xs text-fg-muted">
            Manage and access your workspaces
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/workspaces/browse"
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-fg-secondary transition-colors hover:border-accent/30 hover:text-fg-primary"
          >
            <Search size={12} />
            Browse
          </Link>
          <Link
            href="/dashboard/workspaces/new"
            className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-bg-primary transition-all hover:bg-accent-emphasis hover:shadow-[0_0_16px_-4px] hover:shadow-accent/40"
          >
            <Plus size={12} />
            Create
          </Link>
        </div>
      </div>

      <div className="mt-2 h-px bg-linear-to-r from-accent-subtle via-accent to-transparent" />

      {memberships.length === 0 ? (
        <div className="mt-16 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-subtle/10">
            <Plus size={20} className="text-accent-subtle" />
          </div>
          <p className="text-xs text-fg-muted">
            You&apos;re not a member of any workspaces yet.
          </p>
          <Link
            href="/dashboard/workspaces/new"
            className="mt-4 inline-block rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-bg-primary transition-all hover:bg-accent-emphasis"
          >
            Create your first workspace
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {memberships.map(({ workspace, role }) => (
            <Link
              key={workspace.id}
              href={`/dashboard/workspaces/${workspace.id}`}
              className="group rounded-md border border-border bg-bg-elevated/60 p-4 backdrop-blur-sm transition-all hover:border-accent/40 hover:shadow-[0_0_24px_-8px] hover:shadow-accent/20"
            >
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-accent-subtle" />
                <h3 className="font-mono text-sm font-medium text-fg-primary transition-colors group-hover:text-accent">
                  {workspace.name}
                </h3>
              </div>
              {workspace.description && (
                <p className="mt-2 text-xs text-fg-muted line-clamp-2">
                  {workspace.description}
                </p>
              )}
              <div className="mt-3 flex items-center gap-3 text-[11px] text-fg-muted">
                <span>{workspace._count.members} members</span>
                <span className="text-border">·</span>
                <span>{workspace._count.boards} boards</span>
                <span className="text-border">·</span>
                <span
                  className="rounded-full border px-1.5 py-0.5"
                  style={{
                    borderColor: role.color + "40",
                    color: role.color,
                  }}
                >
                  {role.name}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
