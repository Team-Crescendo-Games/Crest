import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, Mail, ClipboardList } from "lucide-react";
import { hasPermission, Permission } from "@/lib/permissions";
import { getLeaveWarning } from "@/lib/actions/workspace";
import { InviteSection } from "./invite-section";
import { ApplicationList } from "./application-list";
import { LeaveWorkspaceButton } from "./leave-button";
import { MemberRoleSelect } from "./member-role-select";
import { UserAvatar } from "@/components/user-avatar";

export default async function WorkspaceTeamPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const session = await auth();
  const userId = session!.user!.id!;

  const membership = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
    include: { role: true },
  });

  if (!membership) notFound();

  const canInvite = hasPermission(
    membership.role.permissions,
    Permission.INVITE_MEMBERS,
  );
  const canManageApps = hasPermission(
    membership.role.permissions,
    Permission.MANAGE_APPLICATIONS,
  );
  const canManageRoles = hasPermission(
    membership.role.permissions,
    Permission.MANAGE_ROLES,
  );

  const [members, applications, invitations, workspace, roles] =
    await Promise.all([
      prisma.workspaceMember.findMany({
        where: { workspaceId },
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
          role: { select: { id: true, name: true, color: true } },
        },
        orderBy: { joinedAt: "asc" },
      }),
      canManageApps
        ? prisma.workspaceApplication.findMany({
            where: { workspaceId, status: "PENDING" },
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
            orderBy: { createdAt: "desc" },
          })
        : [],
      canInvite
        ? prisma.workspaceInvitation.findMany({
            where: { workspaceId },
            include: {
              createdBy: { select: { name: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 20,
          })
        : [],
      prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { name: true },
      }),
      prisma.role.findMany({
        where: { workspaceId },
        select: { id: true, name: true, color: true },
        orderBy: { name: "asc" },
      }),
    ]);

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/dashboard/workspaces/${workspaceId}`}
        className="mb-6 inline-flex items-center gap-1.5 text-xs text-fg-muted transition-colors hover:text-fg-secondary"
      >
        <ArrowLeft size={12} />
        Back to workspace
      </Link>

      <div className="flex items-center gap-2">
        <Users size={16} className="text-accent" />
        <h1 className="font-mono text-lg font-semibold text-fg-primary">
          Team
        </h1>
      </div>
      <p className="mt-1 text-xs text-fg-muted">
        {members.length} member{members.length !== 1 && "s"} in{" "}
        {workspace?.name}
      </p>

      {/* Members */}
      <section className="mt-6">
        <h2 className="flex items-center gap-2 font-mono text-sm font-medium text-fg-primary">
          <Users size={13} className="text-accent" />
          Members
        </h2>
        <div className="mt-3 space-y-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between rounded-md border border-border bg-bg-elevated/60 px-4 py-3 backdrop-blur-sm"
            >
              <div className="flex items-center gap-3">
                <UserAvatar
                  name={member.user.name}
                  image={member.user.image}
                  size={32}
                />
                <div>
                  <p className="text-xs font-medium text-fg-primary">
                    {member.user.name}
                    {member.user.id === userId && (
                      <span className="ml-1.5 text-[11px] text-fg-muted">
                        (you)
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-fg-muted">
                    {member.user.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-fg-muted">
                  Joined {member.joinedAt.toLocaleDateString()}
                </span>
                <MemberRoleSelect
                  memberId={member.id}
                  currentRoleId={member.role.id}
                  roles={roles}
                  workspaceId={workspaceId}
                  canManage={canManageRoles}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Invitations */}
      {canInvite && (
        <section className="mt-8">
          <h2 className="flex items-center gap-2 font-mono text-sm font-medium text-fg-primary">
            <Mail size={13} className="text-accent" />
            Invitations
          </h2>
          <div className="mt-3">
            <InviteSection
              workspaceId={workspaceId}
              invitations={invitations.map((inv) => ({
                id: inv.id,
                createdByName: inv.createdBy.name ?? "Unknown",
                createdAt: inv.createdAt,
                expiresAt: inv.expiresAt,
                isExpired: inv.expiresAt < new Date(),
              }))}
            />
          </div>
        </section>
      )}

      {/* Applications */}
      {canManageApps && applications.length > 0 && (
        <section className="mt-8">
          <h2 className="flex items-center gap-2 font-mono text-sm font-medium text-fg-primary">
            <ClipboardList size={13} className="text-accent" />
            Pending Applications
            <span className="rounded-full bg-accent/10 px-1.5 py-0.5 text-[11px] font-medium text-accent">
              {applications.length}
            </span>
          </h2>
          <div className="mt-3">
            <ApplicationList
              applications={applications.map((app) => ({
                id: app.id,
                message: app.message,
                createdAt: app.createdAt,
                user: app.user,
              }))}
            />
          </div>
        </section>
      )}

      {/* Leave workspace */}
      <section className="mt-10 border-t border-border pt-6">
        <LeaveWorkspaceButton
          workspaceId={workspaceId}
          leaveWarning={await getLeaveWarning(workspaceId)}
        />
      </section>
    </div>
  );
}
