"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { JoinPolicy } from "@/prisma/generated/prisma/enums";
import {
  DEFAULT_MEMBER_PERMISSIONS,
  Permission,
  hasPermission,
  getEffectivePermissions,
} from "@/lib/permissions";

// ─── Helpers ────────────────────────────────────────────────────────────────

async function requireMembership(userId: string, workspaceId: string) {
  const membership = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
    include: { role: true, workspace: { select: { createdById: true } } },
  });
  if (!membership) throw new Error("Not a member of this workspace");
  return membership;
}

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

  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;

  if (!name || name.trim().length === 0) {
    return { error: "Workspace name is required" };
  }

  const workspace = await prisma.workspace.create({
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

  redirect(`/w/${workspace.id}`);
}

// ─── Update ─────────────────────────────────────────────────────────────────

export async function updateWorkspace(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const workspaceId = formData.get("workspaceId") as string;
  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;
  const joinPolicy = formData.get("joinPolicy") as JoinPolicy;

  if (!workspaceId || !name?.trim()) {
    return { error: "Workspace name is required" };
  }

  const membership = await requireMembership(session.user.id, workspaceId);
  const effectivePerms = getEffectivePermissions(membership.role.permissions, session.user.id, membership.workspace.createdById);
  if (!hasPermission(effectivePerms, Permission.MANAGE_WORKSPACE)) {
    return { error: "You don't have permission to edit workspace settings" };
  }

  await prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      joinPolicy: joinPolicy || "INVITE_ONLY",
    },
  });

  revalidatePath(`/w/${workspaceId}`);
  return { success: true };
}

// ─── Join (open workspaces) ─────────────────────────────────────────────────

export async function joinWorkspace(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const workspaceId = formData.get("workspaceId") as string;
  if (!workspaceId) return { error: "Workspace ID is required" };

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  });

  if (!workspace) return { error: "Workspace not found" };
  if (workspace.joinPolicy !== "OPEN") return { error: "This workspace is not open" };

  const existing = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: session.user.id, workspaceId } },
  });
  if (existing) return { error: "You are already a member" };

  const memberRole = await getOrCreateMemberRole(workspaceId);

  await prisma.workspaceMember.create({
    data: { userId: session.user.id, workspaceId, roleId: memberRole.id },
  });

  redirect(`/w/${workspaceId}`);
}

// ─── Apply (apply-to-join workspaces) ───────────────────────────────────────

export async function applyToWorkspace(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const workspaceId = formData.get("workspaceId") as string;
  const message = (formData.get("message") as string) || null;

  if (!workspaceId) return { error: "Workspace ID is required" };

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

  await prisma.workspaceApplication.create({
    data: {
      userId: session.user.id,
      workspaceId,
      message: message?.trim() || null,
    },
  });

  return { success: true, message: "Application submitted" };
}

// ─── Handle application ─────────────────────────────────────────────────────

export async function handleApplication(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const applicationId = formData.get("applicationId") as string;
  const action = formData.get("action") as "approve" | "reject";

  if (!applicationId || !action) return { error: "Invalid request" };

  const application = await prisma.workspaceApplication.findUnique({
    where: { id: applicationId },
  });

  if (!application) return { error: "Application not found" };

  const membership = await requireMembership(
    session.user.id,
    application.workspaceId
  );
  const appPerms = getEffectivePermissions(membership.role.permissions, session.user.id, membership.workspace.createdById);
  if (
    !hasPermission(appPerms, Permission.MANAGE_APPLICATIONS)
  ) {
    return { error: "You don't have permission to manage applications" };
  }

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

  revalidatePath(`/w/${application.workspaceId}/settings`);
  return { success: true };
}

// ─── Invitations ────────────────────────────────────────────────────────────

export async function createInvitation(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const workspaceId = formData.get("workspaceId") as string;
  const expiresInDays = parseInt(formData.get("expiresInDays") as string) || 7;

  if (!workspaceId) return { error: "Workspace ID is required" };

  const membership = await requireMembership(session.user.id, workspaceId);
  const invitePerms = getEffectivePermissions(membership.role.permissions, session.user.id, membership.workspace.createdById);
  if (!hasPermission(invitePerms, Permission.INVITE_MEMBERS)) {
    return { error: "You don't have permission to invite members" };
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const invitation = await prisma.workspaceInvitation.create({
    data: {
      workspaceId,
      createdById: session.user.id,
      expiresAt,
    },
  });

  revalidatePath(`/w/${workspaceId}/settings`);
  return { success: true, inviteId: invitation.id };
}

export async function acceptInvitation(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const inviteId = formData.get("inviteId") as string;
  if (!inviteId) return { error: "Invitation ID is required" };

  const invitation = await prisma.workspaceInvitation.findUnique({
    where: { id: inviteId },
  });

  if (!invitation) return { error: "Invitation not found" };
  if (invitation.expiresAt < new Date()) return { error: "Invitation has expired" };

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

  await prisma.workspaceMember.create({
    data: {
      userId: session.user.id,
      workspaceId: invitation.workspaceId,
      roleId: memberRole.id,
    },
  });

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

  // Owners cannot leave — return null to hide the button
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

  // Last member — workspace will become empty
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

  const workspaceId = formData.get("workspaceId") as string;
  if (!workspaceId) return { error: "Workspace ID is required" };

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { createdById: true, joinPolicy: true },
  });

  if (!workspace) return { error: "Workspace not found" };

  if (workspace.createdById === session.user.id) {
    return {
      error:
        "Owners cannot leave the workspace. Delete the workspace instead.",
    };
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: session.user.id, workspaceId } },
  });

  if (!membership) return { error: "You are not a member" };

  const memberCount = await prisma.workspaceMember.count({
    where: { workspaceId },
  });

  // Remove the member
  await prisma.workspaceMember.delete({
    where: { id: membership.id },
  });

  // If this was the last member, handle cleanup
  if (memberCount === 1) {
    if (
      workspace.joinPolicy === "INVITE_ONLY" ||
      workspace.joinPolicy === "APPLY_TO_JOIN"
    ) {
      // No way for new members to join — delete immediately
      await prisma.workspace.delete({ where: { id: workspaceId } });
    }
    // For OPEN workspaces, a scheduled job would clean up after 7 days.
    // For now we leave it — the workspace exists but has no members.
  }

  revalidatePath("/dashboard", "layout");
  redirect("/w");
}

// ─── Transfer ownership ─────────────────────────────────────────────────────

export async function transferOwnership(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const workspaceId = formData.get("workspaceId") as string;
  const newOwnerId = formData.get("newOwnerId") as string;

  if (!workspaceId || !newOwnerId) return { error: "Invalid request" };

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

  // Verify the target is a member of the workspace
  const targetMember = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: newOwnerId, workspaceId } },
  });
  if (!targetMember) {
    return { error: "Target user is not a member of this workspace" };
  }

  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { createdById: newOwnerId },
  });

  revalidatePath(`/w/${workspaceId}/team`);
  revalidatePath(`/w/${workspaceId}`);
  revalidatePath("/dashboard", "layout");
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
