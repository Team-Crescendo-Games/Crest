"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { hasPermission, Permission } from "@/lib/permissions";

const PROTECTED_ROLES = ["Owner", "Member"];

async function requireManageRoles(userId: string, workspaceId: string) {
  const m = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
    include: { role: true },
  });
  if (!m) throw new Error("Not a member");
  if (!hasPermission(m.role.permissions, Permission.MANAGE_ROLES))
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
  if (PROTECTED_ROLES.includes(name.trim())) {
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

  revalidatePath(`/dashboard/workspaces/${workspaceId}`);
  revalidatePath(`/dashboard/workspaces/${workspaceId}/team`);
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
  if (PROTECTED_ROLES.includes(role.name)) {
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

  revalidatePath(`/dashboard/workspaces/${workspaceId}`);
  revalidatePath(`/dashboard/workspaces/${workspaceId}/team`);
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
  if (PROTECTED_ROLES.includes(role.name)) {
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

  revalidatePath(`/dashboard/workspaces/${workspaceId}`);
  revalidatePath(`/dashboard/workspaces/${workspaceId}/team`);
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

  await prisma.workspaceMember.update({
    where: { id: memberId },
    data: { roleId },
  });

  revalidatePath(`/dashboard/workspaces/${workspaceId}/team`);
  return { success: true };
}
