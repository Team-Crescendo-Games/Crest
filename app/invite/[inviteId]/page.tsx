import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { AcceptInviteButton } from "./accept-button";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ inviteId: string }>;
}) {
  const { inviteId } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect(`/sign-in?callbackUrl=/invite/${inviteId}`);
  }

  const invitation = await prisma.workspaceInvitation.findUnique({
    where: { id: inviteId },
    include: {
      workspace: { select: { id: true, name: true, description: true } },
      createdBy: { select: { name: true } },
    },
  });

  if (!invitation) notFound();

  const isExpired = invitation.expiresAt < new Date();

  const existingMembership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId: session.user.id!,
        workspaceId: invitation.workspaceId,
      },
    },
  });

  if (existingMembership) {
    redirect(`/dashboard/workspaces/${invitation.workspaceId}`);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-bg-elevated/80 p-8 backdrop-blur-sm">
        <div className="text-center">
          <h1 className="font-mono text-lg font-semibold text-fg-primary">
            Workspace Invitation
          </h1>
          <p className="mt-2 text-xs text-fg-muted">
            You&apos;ve been invited to join
          </p>
          <p className="mt-1 font-mono text-sm font-medium text-accent">
            {invitation.workspace.name}
          </p>
          {invitation.workspace.description && (
            <p className="mt-1 text-xs text-fg-muted">
              {invitation.workspace.description}
            </p>
          )}
          <p className="mt-2 text-[10px] text-fg-muted">
            Invited by {invitation.createdBy.name}
          </p>
        </div>

        <div className="mt-6">
          {isExpired ? (
            <div className="rounded-md border border-accent-emphasis/30 bg-accent-emphasis/10 px-3 py-2 text-center text-xs text-accent-emphasis">
              This invitation has expired.
            </div>
          ) : (
            <AcceptInviteButton inviteId={inviteId} />
          )}
        </div>
      </div>
    </div>
  );
}
