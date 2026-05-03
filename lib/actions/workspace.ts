"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { DEFAULT_MEMBER_PERMISSIONS, Permission } from "@/lib/permissions";
import { requireMemberWithPermission } from "@/lib/actions/auth-helpers";
import {
  revalidateWorkspace,
  revalidateDashboard,
} from "@/lib/actions/revalidation-helpers";
import { parseFormData } from "@/lib/validations/helpers";
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  joinWorkspaceSchema,
  applyToWorkspaceSchema,
  handleApplicationSchema,
  createInvitationSchema,
  acceptInvitationSchema,
  leaveWorkspaceSchema,
  transferOwnershipSchema,
} from "@/lib/validations/workspace";

// ─── Helpers ────────────────────────────────────────────────────────────────

async function getOrCreateMemberRole(workspaceId: string) {
  let role = await prisma.role.findFirst({
    where: { workspaceId, name: "Member" },
  });
  if (!role) {
    role = await prisma.role.create({
      data: {
        name: "Member",
        color: "#6B7280",
        permissions: DEFAULT_MEMBER_PERMISSIONS,
        workspaceId,
      },
    });
  }
  return role;
}

// ─── Create ─────────────────────────────────────────────────────────────────

export async function createWorkspace(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const parsed = parseFormData(createWorkspaceSchema, formData);
  if (!parsed.success) return { error: parsed.error };
  const { name, description } = parsed.data;

  let workspace;
  try {
    workspace = await prisma.workspace.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        createdById: session.user.id,
        roles: {
          create: {
            name: "Member",
            color: "#6B7280",
            permissions: DEFAULT_MEMBER_PERMISSIONS,
          },
        },
      },
      include: { roles: true },
    });

    await prisma.workspaceMember.create({
      data: {
        userId: session.user.id,
        workspaceId: workspace.id,
        roleId: workspace.roles[0].id,
      },
    });
  } catch (err) {
    console.error(err);
    return { error: "An unexpected error occurred" };
  }

  redirect(`/w/${workspace.id}`);
}

// ─── Update ─────────────────────────────────────────────────────────────────

export async function updateWorkspace(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const parsed = parseFormData(updateWorkspaceSchema, formData);
  if (!parsed.success) return { error: parsed.error };
  const { workspaceId, name, description, joinPolicy } = parsed.data;

  try {
    await requireMemberWithPermission(
      session.user.id,
      workspaceId,
      Permission.MANAGE_WORKSPACE,
    );
  } catch {
    return { error: "You don't have permission to edit workspace settings" };
  }

  try {
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        joinPolicy: joinPolicy || "INVITE_ONLY",
      },
    });
  } catch (err) {
    console.error(err);
    return { error: "An unexpected error occurred" };
  }

  revalidateWorkspace(workspaceId);
  return { success: true };
}

// ─── Join (open workspaces) ─────────────────────────────────────────────────

export async function joinWorkspace(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const parsed = parseFormData(joinWorkspaceSchema, formData);
  if (!parsed.success) return { error: parsed.error };
  const { workspaceId } = parsed.data;

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  });

  if (!workspace) return { error: "Workspace not found" };
  if (workspace.joinPolicy !== "OPEN")
    return { error: "This workspace is not open" };

  const existing = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: session.user.id, workspaceId } },
  });
  if (existing) return { error: "You are already a member" };

  const memberRole = await getOrCreateMemberRole(workspaceId);

  try {
    await prisma.workspaceMember.create({
      data: { userId: session.user.id, workspaceId, roleId: memberRole.id },
    });
  } catch (err) {
    console.error(err);
    return { error: "An unexpected error occurred" };
  }

  redirect(`/w/${workspaceId}`);
}

// ─── Apply (apply-to-join workspaces) ───────────────────────────────────────

export async function applyToWorkspace(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const parsed = parseFormData(applyToWorkspaceSchema, formData);
  if (!parsed.success) return { error: parsed.error };
  const { workspaceId, message } = parsed.data;

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  });

  if (!workspace) return { error: "Workspace not found" };
  if (workspace.joinPolicy !== "APPLY_TO_JOIN") {
    return { error: "This workspace does not accept applications" };
  }

  const existing = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: session.user.id, workspaceId } },
  });
  if (existing) return { error: "You are already a member" };

  const existingApp = await prisma.workspaceApplication.findUnique({
    where: { userId_workspaceId: { userId: session.user.id, workspaceId } },
  });
  if (existingApp) return { error: "You already have a pending application" };

  try {
    await prisma.workspaceApplication.create({
      data: {
        userId: session.user.id,
        workspaceId,
        message: message?.trim() || null,
      },
    });
  } catch (err) {
    console.error(err);
    return { error: "An unexpected error occurred" };
  }

  return { success: true, message: "Application submitted" };
}

// ─── Handle application ─────────────────────────────────────────────────────

export async function handleApplication(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const parsed = parseFormData(handleApplicationSchema, formData);
  if (!parsed.success) return { error: parsed.error };
  const { applicationId, action } = parsed.data;

  const application = await prisma.workspaceApplication.findUnique({
    where: { id: applicationId },
  });

  if (!application) return { error: "Application not found" };

  try {
    await requireMemberWithPermission(
      session.user.id,
      application.workspaceId,
      Permission.MANAGE_APPLICATIONS,
    );
  } catch {
    return { error: "You don't have permission to manage applications" };
  }

  try {
    if (action === "approve") {
      const memberRole = await getOrCreateMemberRole(application.workspaceId);

      await prisma.$transaction([
        prisma.workspaceApplication.update({
          where: { id: applicationId },
          data: { status: "APPROVED" },
        }),
        prisma.workspaceMember.create({
          data: {
            userId: application.userId,
            workspaceId: application.workspaceId,
            roleId: memberRole.id,
          },
        }),
      ]);
    } else {
      await prisma.workspaceApplication.update({
        where: { id: applicationId },
        data: { status: "REJECTED" },
      });
    }
  } catch (err) {
    console.error(err);
    return { error: "An unexpected error occurred" };
  }

  revalidatePath(`/w/${application.workspaceId}/settings`);
  return { success: true };
}

// ─── Invitations ────────────────────────────────────────────────────────────

export async function createInvitation(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const parsed = parseFormData(createInvitationSchema, formData);
  if (!parsed.success) return { error: parsed.error };
  const { workspaceId, expiresInDays } = parsed.data;

  const expiresInDaysNum = parseInt(expiresInDays) || 7;

  try {
    await requireMemberWithPermission(
      session.user.id,
      workspaceId,
      Permission.INVITE_MEMBERS,
    );
  } catch {
    return { error: "You don't have permission to invite members" };
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDaysNum);

  let invitation;
  try {
    invitation = await prisma.workspaceInvitation.create({
      data: {
        workspaceId,
        createdById: session.user.id,
        expiresAt,
      },
    });
  } catch (err) {
    console.error(err);
    return { error: "An unexpected error occurred" };
  }

  revalidatePath(`/w/${workspaceId}/settings`);
  return { success: true, inviteId: invitation.id };
}

export async function acceptInvitation(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const parsed = parseFormData(acceptInvitationSchema, formData);
  if (!parsed.success) return { error: parsed.error };
  const { inviteId } = parsed.data;

  const invitation = await prisma.workspaceInvitation.findUnique({
    where: { id: inviteId },
  });

  if (!invitation) return { error: "Invitation not found" };
  if (invitation.expiresAt < new Date())
    return { error: "Invitation has expired" };

  const existing = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId: session.user.id,
        workspaceId: invitation.workspaceId,
      },
    },
  });
  if (existing) return { error: "You are already a member" };

  const memberRole = await getOrCreateMemberRole(invitation.workspaceId);

  try {
    await prisma.workspaceMember.create({
      data: {
        userId: session.user.id,
        workspaceId: invitation.workspaceId,
        roleId: memberRole.id,
      },
    });
  } catch (err) {
    console.error(err);
    return { error: "An unexpected error occurred" };
  }

  redirect(`/w/${invitation.workspaceId}`);
}

// ─── Leave workspace ────────────────────────────────────────────────────────

export async function getLeaveWarning(workspaceId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { joinPolicy: true, name: true, createdById: true },
  });

  if (!workspace) return null;

  if (workspace.createdById === session.user.id) return null;

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: { userId: session.user.id, workspaceId },
    },
  });

  if (!membership) return null;

  const memberCount = await prisma.workspaceMember.count({
    where: { workspaceId },
  });

  const isLastMember = memberCount === 1;

  if (!isLastMember) {
    return { isLastMember: false, willDelete: false, name: workspace.name };
  }

  const willDeleteImmediately =
    workspace.joinPolicy === "INVITE_ONLY" ||
    workspace.joinPolicy === "APPLY_TO_JOIN";

  return {
    isLastMember: true,
    willDelete: true,
    immediate: willDeleteImmediately,
    name: workspace.name,
  };
}

export async function leaveWorkspace(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const parsed = parseFormData(leaveWorkspaceSchema, formData);
  if (!parsed.success) return { error: parsed.error };
  const { workspaceId } = parsed.data;

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { createdById: true, joinPolicy: true },
  });

  if (!workspace) return { error: "Workspace not found" };

  if (workspace.createdById === session.user.id) {
    return {
      error: "Owners cannot leave the workspace. Delete the workspace instead.",
    };
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: session.user.id, workspaceId } },
  });

  if (!membership) return { error: "You are not a member" };

  const memberCount = await prisma.workspaceMember.count({
    where: { workspaceId },
  });

  try {
    await prisma.workspaceMember.delete({
      where: { id: membership.id },
    });

    if (memberCount === 1) {
      if (
        workspace.joinPolicy === "INVITE_ONLY" ||
        workspace.joinPolicy === "APPLY_TO_JOIN"
      ) {
        await prisma.workspace.delete({ where: { id: workspaceId } });
      }
    }
  } catch (err) {
    console.error(err);
    return { error: "An unexpected error occurred" };
  }

  revalidateDashboard();
  redirect("/w");
}

// ─── Transfer ownership ─────────────────────────────────────────────────────

export async function transferOwnership(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const parsed = parseFormData(transferOwnershipSchema, formData);
  if (!parsed.success) return { error: parsed.error };
  const { workspaceId, newOwnerId } = parsed.data;

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { createdById: true },
  });

  if (!workspace) return { error: "Workspace not found" };
  if (workspace.createdById !== session.user.id) {
    return { error: "Only the workspace owner can transfer ownership" };
  }
  if (newOwnerId === session.user.id) {
    return { error: "You are already the owner" };
  }

  const targetMember = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: newOwnerId, workspaceId } },
  });
  if (!targetMember) {
    return { error: "Target user is not a member of this workspace" };
  }

  try {
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { createdById: newOwnerId },
    });
  } catch (err) {
    console.error(err);
    return { error: "An unexpected error occurred" };
  }

  revalidatePath(`/w/${workspaceId}/team`);
  revalidateWorkspace(workspaceId);
  revalidateDashboard();
  return { success: true };
}

// ─── Dashboard: fetch workspace form data for task creation ─────────────

export async function getWorkspaceFormData(workspaceId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const membership = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: session.user.id, workspaceId } },
  });
  if (!membership) throw new Error("Not a member");

  const [boards, members, tags, sprints] = await Promise.all([
    prisma.board.findMany({
      where: { workspaceId, isActive: true },
      select: { id: true, name: true },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.workspaceMember.findMany({
      where: { workspaceId },
      select: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.tag.findMany({
      where: { workspaceId },
      select: { id: true, name: true, color: true },
      orderBy: { name: "asc" },
    }),
    prisma.sprint.findMany({
      where: { workspaceId, isActive: true },
      select: { id: true, title: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    boards,
    members: members.map((m) => m.user),
    tags,
    sprints,
  };
}
