import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { hasPermission, Permission } from "@/lib/permissions";
import { WorkspaceSettingsForm } from "./settings-form";

export default async function WorkspaceSettingsPage({
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
      workspace: true,
    },
  });

  if (!membership) notFound();

  if (
    !hasPermission(membership.role.permissions, Permission.MANAGE_WORKSPACE)
  ) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-lg">
      <Link
        href={`/dashboard/workspaces/${workspaceId}`}
        className="mb-6 inline-flex items-center gap-1.5 text-xs text-fg-muted transition-colors hover:text-fg-secondary"
      >
        <ArrowLeft size={12} />
        Back to workspace
      </Link>

      <h1 className="font-mono text-lg font-semibold text-fg-primary">
        Workspace Settings
      </h1>
      <p className="mt-1 text-xs text-fg-muted">
        Manage your workspace configuration.
      </p>

      <div className="mt-6">
        <WorkspaceSettingsForm workspace={membership.workspace} />
      </div>
    </div>
  );
}
