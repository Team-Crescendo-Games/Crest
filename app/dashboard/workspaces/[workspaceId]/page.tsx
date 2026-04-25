import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  LayoutList,
  Timer,
  Settings,
  Users,
  Tag,
  Shield,
  Calendar,
} from "lucide-react";
import {
  hasPermission,
  Permission,
  PERMISSION_LABELS,
  PermissionKey,
} from "@/lib/permissions";
import { TagManager } from "@/components/tag-manager";
import { RoleManager } from "@/components/role-manager";

export default async function WorkspaceOverviewPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const session = await auth();
  const userId = session!.user!.id!;

  const membership = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
    include: {
      role: true,
      workspace: {
        include: {
          boards: {
            orderBy: { displayOrder: "asc" },
            include: { _count: { select: { tasks: true } } },
          },
          sprints: {
            orderBy: { createdAt: "desc" },
            include: { _count: { select: { tasks: true } } },
          },
          tags: { orderBy: { name: "asc" } },
          roles: {
            orderBy: { name: "asc" },
            include: { _count: { select: { members: true } } },
          },
          _count: { select: { members: true } },
        },
      },
    },
  });

  if (!membership) notFound();

  const { workspace } = membership;
  const canManage = hasPermission(
    membership.role.permissions,
    Permission.MANAGE_WORKSPACE,
  );

  const JOIN_POLICY_LABELS = {
    INVITE_ONLY: "Invite Only",
    APPLY_TO_JOIN: "Apply to Join",
    OPEN: "Open",
  };

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-mono text-lg font-semibold text-fg-primary">
            {workspace.name}
          </h1>
          {workspace.description && (
            <p className="mt-1 text-xs text-fg-muted">
              {workspace.description}
            </p>
          )}
          <div className="mt-1.5 flex items-center gap-3 text-[11px] text-fg-muted">
            <span>
              {workspace._count.members} member
              {workspace._count.members !== 1 && "s"}
            </span>
            <span className="text-border">·</span>
            <span>{JOIN_POLICY_LABELS[workspace.joinPolicy]}</span>
            <span className="text-border">·</span>
            <span className="flex items-center gap-1">
              <Calendar size={10} />
              {workspace.createdAt.toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/workspaces/${workspaceId}/team`}
            className="flex items-center gap-1.5 rounded-md bg-bg-secondary px-2.5 py-1.5 text-[11px] font-medium text-fg-secondary transition-colors hover:text-fg-primary"
          >
            <Users size={12} />
            Team
          </Link>
          {canManage && (
            <Link
              href={`/dashboard/workspaces/${workspaceId}/settings`}
              className="flex items-center gap-1.5 rounded-md bg-bg-secondary px-2.5 py-1.5 text-[11px] font-medium text-fg-secondary transition-colors hover:text-fg-primary"
            >
              <Settings size={12} />
              Settings
            </Link>
          )}
        </div>
      </div>

      {/* Boards */}
      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-mono text-sm font-medium text-fg-primary">
            <LayoutList size={14} className="text-accent" />
            Boards
          </h2>
          <Link
            href={`/dashboard/workspaces/${workspaceId}/boards/new`}
            className="flex items-center gap-1 rounded-md bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent transition-colors hover:bg-accent/20"
          >
            <Plus size={11} />
            New Board
          </Link>
        </div>
        {workspace.boards.length === 0 ? (
          <p className="mt-4 text-xs text-fg-muted">
            No boards yet. Create one to start organizing tasks.
          </p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {workspace.boards.map(
              (board) =>
                board.isActive && (
                  <Link
                    key={board.id}
                    href={`/dashboard/workspaces/${workspaceId}/boards/${board.id}`}
                    className="group rounded-md border border-border bg-bg-elevated/60 p-4 backdrop-blur-sm transition-all hover:border-accent/40"
                  >
                    <h3 className="font-mono text-sm font-medium text-fg-primary transition-colors group-hover:text-accent">
                      {board.name}
                    </h3>
                    {board.description && (
                      <p className="mt-1 text-xs text-fg-muted line-clamp-2">
                        {board.description}
                      </p>
                    )}
                    <p className="mt-2 text-[11px] text-fg-muted">
                      {board._count.tasks} task{board._count.tasks !== 1 && "s"}
                    </p>
                  </Link>
                ),
            )}
          </div>
        )}
      </section>

      {/* Sprints */}
      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-mono text-sm font-medium text-fg-primary">
            <Timer size={14} className="text-accent" />
            Sprints
          </h2>
          <Link
            href={`/dashboard/workspaces/${workspaceId}/sprints/new`}
            className="flex items-center gap-1 rounded-md bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent transition-colors hover:bg-accent/20"
          >
            <Plus size={11} />
            New Sprint
          </Link>
        </div>
        {workspace.sprints.length === 0 ? (
          <p className="mt-4 text-xs text-fg-muted">
            No sprints yet. Create one to organize tasks into time-based cycles.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {workspace.sprints.map((sprint) => (
              <div
                key={sprint.id}
                className="flex items-center justify-between rounded-md border border-border bg-bg-elevated/60 px-4 py-3 backdrop-blur-sm"
              >
                <div>
                  <p className="font-mono text-sm font-medium text-fg-primary">
                    {sprint.title}
                  </p>
                  <p className="mt-0.5 text-[11px] text-fg-muted">
                    {sprint._count.tasks} task
                    {sprint._count.tasks !== 1 && "s"}
                    {sprint.startDate && sprint.endDate && (
                      <>
                        {" · "}
                        {new Date(sprint.startDate).toLocaleDateString()} –{" "}
                        {new Date(sprint.endDate).toLocaleDateString()}
                      </>
                    )}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    sprint.isActive
                      ? "bg-accent/10 text-accent"
                      : "bg-bg-secondary text-fg-muted"
                  }`}
                >
                  {sprint.isActive ? "Active" : "Closed"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Tags & Roles side-by-side */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Tags */}
        <section>
          <h2 className="flex items-center gap-2 font-mono text-sm font-medium text-fg-primary">
            <Tag size={14} className="text-accent" />
            Tags
          </h2>
          <div className="mt-3">
            <TagManager
              tags={workspace.tags}
              workspaceId={workspaceId}
              canCreate={hasPermission(
                membership.role.permissions,
                Permission.CREATE_CONTENT,
              )}
              canEdit={hasPermission(
                membership.role.permissions,
                Permission.EDIT_CONTENT,
              )}
              canDelete={hasPermission(
                membership.role.permissions,
                Permission.DELETE_CONTENT,
              )}
            />
          </div>
        </section>

        {/* Roles */}
        <section>
          <h2 className="flex items-center gap-2 font-mono text-sm font-medium text-fg-primary">
            <Shield size={14} className="text-accent" />
            Roles
          </h2>
          <div className="mt-3">
            <RoleManager
              roles={workspace.roles}
              workspaceId={workspaceId}
              canManage={hasPermission(
                membership.role.permissions,
                Permission.MANAGE_ROLES,
              )}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
