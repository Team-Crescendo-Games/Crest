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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  hasPermission,
  getEffectivePermissions,
  Permission,
} from "@/lib/permissions";
import { TagManager } from "@/components/tag-manager";
import { RoleManager } from "@/components/role-manager";

const SPRINTS_PER_PAGE = 5;

export default async function WorkspaceOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { workspaceId } = await params;
  const { sprintPage } = await searchParams;
  const currentSprintPage = Math.max(
    1,
    parseInt(String(sprintPage ?? "1"), 10) || 1,
  );
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

  const [sprints, totalSprints] = await Promise.all([
    prisma.sprint.findMany({
      where: { workspaceId },
      orderBy: [
        { isActive: "desc" },
        { startDate: "desc" },
        { createdAt: "desc" },
      ],
      include: { _count: { select: { tasks: true } } },
      skip: (currentSprintPage - 1) * SPRINTS_PER_PAGE,
      take: SPRINTS_PER_PAGE,
    }),
    prisma.sprint.count({ where: { workspaceId } }),
  ]);

  const totalSprintPages = Math.max(
    1,
    Math.ceil(totalSprints / SPRINTS_PER_PAGE),
  );
  const effectivePerms = getEffectivePermissions(
    membership.role.permissions,
    userId,
    workspace.createdById,
  );
  const canManage = hasPermission(effectivePerms, Permission.MANAGE_WORKSPACE);

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
            href={`/w/${workspaceId}/team`}
            className="flex items-center gap-1.5 rounded-md bg-bg-secondary px-2.5 py-1.5 text-[11px] font-medium text-fg-secondary transition-colors hover:text-fg-primary"
          >
            <Users size={12} />
            Team
          </Link>
          {canManage && (
            <Link
              href={`/w/${workspaceId}/settings`}
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
            href={`/w/${workspaceId}/b/new`}
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
                    href={`/w/${workspaceId}/b/${board.id}`}
                    className="group rounded-md border border-accent-subtle/25 bg-accent-subtle/5 p-4 backdrop-blur-sm transition-all hover:border-accent/40 hover:bg-accent-subtle/10"
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
            {totalSprints > 0 && (
              <span className="text-[11px] font-normal text-fg-muted">
                ({totalSprints})
              </span>
            )}
          </h2>
          <Link
            href={`/w/${workspaceId}/s/new`}
            className="flex items-center gap-1 rounded-md bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent transition-colors hover:bg-accent/20"
          >
            <Plus size={11} />
            New Sprint
          </Link>
        </div>
        {sprints.length === 0 && currentSprintPage === 1 ? (
          <p className="mt-4 text-xs text-fg-muted">
            No sprints yet. Create one to organize tasks into time-based cycles.
          </p>
        ) : (
          <>
            <div className="mt-3 space-y-2">
              {sprints.map((sprint) => (
                <Link
                  key={sprint.id}
                  href={`/w/${workspaceId}/s/${sprint.id}`}
                  className="group flex items-center justify-between rounded-md border border-border bg-bg-elevated/60 px-4 py-3 backdrop-blur-sm transition-all hover:border-accent/40"
                >
                  <div>
                    <p className="font-mono text-sm font-medium text-fg-primary transition-colors group-hover:text-accent">
                      {sprint.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-fg-muted">
                      {sprint._count.tasks} task
                      {sprint._count.tasks !== 1 && "s"}
                      {sprint.startDate && sprint.endDate && (
                        <>
                          {" · "}
                          {new Date(
                            sprint.startDate,
                          ).toLocaleDateString()} –{" "}
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
                </Link>
              ))}
            </div>
            {totalSprintPages > 1 && (
              <div className="mt-3 flex items-center justify-between">
                <p className="text-[11px] text-fg-muted">
                  Page {currentSprintPage} of {totalSprintPages}
                </p>
                <div className="flex items-center gap-1.5">
                  {currentSprintPage > 1 ? (
                    <Link
                      href={`/w/${workspaceId}?sprintPage=${currentSprintPage - 1}`}
                      className="flex items-center gap-1 rounded-md bg-bg-secondary px-2.5 py-1 text-[11px] font-medium text-fg-secondary transition-colors hover:text-fg-primary"
                    >
                      <ChevronLeft size={12} />
                      Prev
                    </Link>
                  ) : (
                    <span className="flex items-center gap-1 rounded-md bg-bg-secondary px-2.5 py-1 text-[11px] font-medium text-fg-muted/50 cursor-not-allowed">
                      <ChevronLeft size={12} />
                      Prev
                    </span>
                  )}
                  {currentSprintPage < totalSprintPages ? (
                    <Link
                      href={`/w/${workspaceId}?sprintPage=${currentSprintPage + 1}`}
                      className="flex items-center gap-1 rounded-md bg-bg-secondary px-2.5 py-1 text-[11px] font-medium text-fg-secondary transition-colors hover:text-fg-primary"
                    >
                      Next
                      <ChevronRight size={12} />
                    </Link>
                  ) : (
                    <span className="flex items-center gap-1 rounded-md bg-bg-secondary px-2.5 py-1 text-[11px] font-medium text-fg-muted/50 cursor-not-allowed">
                      Next
                      <ChevronRight size={12} />
                    </span>
                  )}
                </div>
              </div>
            )}
          </>
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
                effectivePerms,
                Permission.CREATE_CONTENT,
              )}
              canEdit={hasPermission(effectivePerms, Permission.EDIT_CONTENT)}
              canDelete={hasPermission(
                effectivePerms,
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
              canManage={hasPermission(effectivePerms, Permission.MANAGE_ROLES)}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
