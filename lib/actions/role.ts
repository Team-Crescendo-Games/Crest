"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Permission } from "@/lib/permissions";
import { requireMemberWithPermission } from "@/lib/actions/auth-helpers";
import { revalidateWorkspace } from "@/lib/actions/revalidation-helpers";
import { parseFormData } from "@/lib/validations/helpers";
import { createRoleSchema, updateRoleSchema, deleteRoleSchema, assignRoleSchema } from "@/lib/validations/role";

const UNEDITABLE_ROLES = ["Owner"];
const UNDELETABLE_ROLES = ["Owner", "Member"];

export async function createRole(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const parsed = parseFormData(createRoleSchema, formData);
  if (!parsed.success) return { error: parsed.error };
  const { workspaceId, name, color, permissions } = parsed.data;

  const permissionBits = parseInt(permissions) || 0;

  if (UNDELETABLE_ROLES.includes(name.trim())) {
    return { error: `"${name.trim()}" is a reserved role name` };
  }

  try {
    await requireMemberWithPermission(session.user.id, workspaceId, Permission.MANAGE_ROLES);
  } catch {
    return { error: "No permission to manage roles" };
  }

  const existing = await prisma.role.findUnique({
    where: { workspaceId_name: { workspaceId, name: name.trim() } },
  });
  if (existing) return { error: "A role with this name already exists" };

  try {
    await prisma.role.create({
      data: {
        name: name.trim(),
        color,
        permissions: permissionBits,
        workspaceId,
      },
    });
  } catch (err) {
    console.error(err);
    return { error: "An unexpected error occurred" };
  }

  revalidateWorkspace(workspaceId);
  revalidatePath(`/w/${workspaceId}/team`);
  return { success: true };
}

export async function updateRole(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const parsed = parseFormData(updateRoleSchema, formData);
  if (!parsed.success) return { error: parsed.error };
  const { roleId, workspaceId, name, color, permissions } = parsed.data;

  const permissionBits = parseInt(permissions) || 0;

  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) return { error: "Role not found" };
  if (UNEDITABLE_ROLES.includes(role.name)) {
    return { error: `The "${role.name}" role cannot be modified` };
  }

  try {
    await requireMemberWithPermission(session.user.id, workspaceId, Permission.MANAGE_ROLES);
  } catch {
    return { error: "No permission" };
  }

  try {
    await prisma.role.update({
      where: { id: roleId },
      data: { name: name.trim(), color, permissions: permissionBits },
    });
  } catch (err) {
    console.error(err);
    return { error: "An unexpected error occurred" };
  }

  revalidateWorkspace(workspaceId);
  revalidatePath(`/w/${workspaceId}/team`);
  return { success: true };
}

export async function deleteRole(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const parsed = parseFormData(deleteRoleSchema, formData);
  if (!parsed.success) return { error: parsed.error };
  const { roleId, workspaceId } = parsed.data;

  const role = await prisma.role.findUnique({
    where: { id: roleId },
    include: { _count: { select: { members: true } } },
  });
  if (!role) return { error: "Role not found" };
  if (UNDELETABLE_ROLES.includes(role.name)) {
    return { error: `The "${role.name}" role cannot be deleted` };
  }
  if (role._count.members > 0) {
    return {
      error: "Cannot delete a role that has members assigned. Reassign them first.",
    };
  }

  try {
    await requireMemberWithPermission(session.user.id, workspaceId, Permission.MANAGE_ROLES);
  } catch {
    return { error: "No permission" };
  }

  try {
    await prisma.role.delete({ where: { id: roleId } });
  } catch (err) {
    console.error(err);
    return { error: "An unexpected error occurred" };
  }

  revalidateWorkspace(workspaceId);
  revalidatePath(`/w/${workspaceId}/team`);
  return { success: true };
}

export async function assignRole(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const parsed = parseFormData(assignRoleSchema, formData);
  if (!parsed.success) return { error: parsed.error };
  const { memberId, roleId, workspaceId } = parsed.data;

  try {
    await requireMemberWithPermission(session.user.id, workspaceId, Permission.MANAGE_ROLES);
  } catch {
    return { error: "No permission" };
  }

  const target = await prisma.workspaceMember.findUnique({
    where: { id: memberId },
    include: { workspace: { select: { createdById: true } } },
  });
  if (target && target.workspace.createdById === target.userId) {
    return { error: "Cannot change the owner's role" };
  }

  const targetRole = await prisma.role.findUnique({ where: { id: roleId } });
  if (!targetRole) return { error: "Role not found" };
  if (targetRole.name === "Owner") {
    return { error: "The Owner role cannot be assigned" };
  }

  try {
    await prisma.workspaceMember.update({
      where: { id: memberId },
      data: { roleId },
    });
  } catch (err) {
    console.error(err);
    return { error: "An unexpected error occurred" };
  }

  revalidatePath(`/w/${workspaceId}/team`);
  return { success: true };
}
