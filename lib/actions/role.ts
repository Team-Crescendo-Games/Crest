"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { hasPermission, getEffectivePermissions, Permission } from "@/lib/permissions";

const UNEDITABLE_ROLES = ["Owner"];
const UNDELETABLE_ROLES = ["Owner", "Member"];

async function requireManageRoles(userId: string, workspaceId: string) {
  const m = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
    include: { role: true, workspace: { select: { createdById: true } } },
  });
  if (!m) throw new Error("Not a member");
  const perms = getEffectivePermissions(m.role.permissions, userId, m.workspace.createdById);
  if (!hasPermission(perms, Permission.MANAGE_ROLES))
    throw new Error("No permission");
  return m;
}

export async function createRole(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const workspaceId = formData.get("workspaceId") as string;
  const name = formData.get("name") as string;
  const color = (formData.get("color") as string) || "#6B7280";
  const permissionBits = parseInt(formData.get("permissions") as string) || 0;

  if (!name?.trim()) return { error: "Role name is required" };
  if (UNDELETABLE_ROLES.includes(name.trim())) {
    return { error: `"${name.trim()}" is a reserved role name` };
  }

  try {
    await requireManageRoles(session.user.id, workspaceId);
  } catch {
    return { error: "No permission to manage roles" };
  }

  const existing = await prisma.role.findUnique({
    where: { workspaceId_name: { workspaceId, name: name.trim() } },
  });
  if (existing) return { error: "A role with this name already exists" };

  await prisma.role.create({
    data: {
      name: name.trim(),
      color,
      permissions: permissionBits,
      workspaceId,
    },
  });

  revalidatePath(`/w/${workspaceId}`);
  revalidatePath(`/w/${workspaceId}/team`);
  return { success: true };
}

export async function updateRole(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const roleId = formData.get("roleId") as string;
  const workspaceId = formData.get("workspaceId") as string;
  const name = formData.get("name") as string;
  const color = (formData.get("color") as string) || "#6B7280";
  const permissionBits = parseInt(formData.get("permissions") as string) || 0;

  if (!roleId || !name?.trim()) return { error: "Role name is required" };

  // Check if it's a protected role
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) return { error: "Role not found" };
  if (UNEDITABLE_ROLES.includes(role.name)) {
    return { error: `The "${role.name}" role cannot be modified` };
  }

  try {
    await requireManageRoles(session.user.id, workspaceId);
  } catch {
    return { error: "No permission" };
  }

  await prisma.role.update({
    where: { id: roleId },
    data: { name: name.trim(), color, permissions: permissionBits },
  });

  revalidatePath(`/w/${workspaceId}`);
  revalidatePath(`/w/${workspaceId}/team`);
  return { success: true };
}

export async function deleteRole(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const roleId = formData.get("roleId") as string;
  const workspaceId = formData.get("workspaceId") as string;

  const role = await prisma.role.findUnique({
    where: { id: roleId },
    include: { _count: { select: { members: true } } },
  });
  if (!role) return { error: "Role not found" };
  if (UNDELETABLE_ROLES.includes(role.name)) {
    return { error: `The "${role.name}" role cannot be deleted` };
  }
  if (role._count.members > 0) {
    return { error: "Cannot delete a role that has members assigned. Reassign them first." };
  }

  try {
    await requireManageRoles(session.user.id, workspaceId);
  } catch {
    return { error: "No permission" };
  }

  await prisma.role.delete({ where: { id: roleId } });

  revalidatePath(`/w/${workspaceId}`);
  revalidatePath(`/w/${workspaceId}/team`);
  return { success: true };
}

export async function assignRole(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const memberId = formData.get("memberId") as string;
  const roleId = formData.get("roleId") as string;
  const workspaceId = formData.get("workspaceId") as string;

  if (!memberId || !roleId) return { error: "Invalid request" };

  try {
    await requireManageRoles(session.user.id, workspaceId);
  } catch {
    return { error: "No permission" };
  }

  // Prevent changing the workspace owner's role
  const target = await prisma.workspaceMember.findUnique({
    where: { id: memberId },
    include: { workspace: { select: { createdById: true } } },
  });
  if (target && target.workspace.createdById === target.userId) {
    return { error: "Cannot change the owner's role" };
  }

  // Prevent assigning the Owner role to anyone
  const targetRole = await prisma.role.findUnique({ where: { id: roleId } });
  if (!targetRole) return { error: "Role not found" };
  if (targetRole.name === "Owner") {
    return { error: "The Owner role cannot be assigned" };
  }

  await prisma.workspaceMember.update({
    where: { id: memberId },
    data: { roleId },
  });

  revalidatePath(`/w/${workspaceId}/team`);
  return { success: true };
}
