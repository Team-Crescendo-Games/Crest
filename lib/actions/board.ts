"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hasPermission, Permission } from "@/lib/permissions";

async function requireMembershipWithPerms(
  userId: string,
  workspaceId: string,
  perm: number
) {
  const membership = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
    include: { role: true },
  });
  if (!membership) throw new Error("Not a member");
  if (!hasPermission(membership.role.permissions, perm)) {
    throw new Error("Insufficient permissions");
  }
  return membership;
}

export async function createBoard(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const workspaceId = formData.get("workspaceId") as string;
  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;

  if (!workspaceId || !name?.trim()) {
    return { error: "Board name is required" };
  }

  try {
    await requireMembershipWithPerms(
      session.user.id,
      workspaceId,
      Permission.CREATE_CONTENT
    );
  } catch {
    return { error: "You don't have permission to create boards" };
  }

  const boardCount = await prisma.board.count({ where: { workspaceId } });

  await prisma.board.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      workspaceId,
      displayOrder: boardCount,
    },
  });

  revalidatePath("/dashboard", "layout");
  redirect(`/dashboard/workspaces/${workspaceId}`);
}

export async function updateBoard(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const boardId = formData.get("boardId") as string;
  const workspaceId = formData.get("workspaceId") as string;
  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;

  if (!boardId || !name?.trim()) {
    return { error: "Board name is required" };
  }

  try {
    await requireMembershipWithPerms(
      session.user.id,
      workspaceId,
      Permission.EDIT_CONTENT
    );
  } catch {
    return { error: "You don't have permission to edit boards" };
  }

  await prisma.board.update({
    where: { id: boardId },
    data: {
      name: name.trim(),
      description: description?.trim() || null,
    },
  });

  revalidatePath(`/dashboard/workspaces/${workspaceId}/boards/${boardId}`);
  return { success: true };
}

export async function archiveBoard(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const boardId = formData.get("boardId") as string;
  const workspaceId = formData.get("workspaceId") as string;

  try {
    await requireMembershipWithPerms(
      session.user.id,
      workspaceId,
      Permission.EDIT_CONTENT
    );
  } catch {
    return { error: "You don't have permission to archive boards" };
  }

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { isActive: true },
  });

  if (!board) return { error: "Board not found" };

  await prisma.board.update({
    where: { id: boardId },
    data: { isActive: !board.isActive },
  });

  revalidatePath(`/dashboard/workspaces/${workspaceId}/boards`);
  revalidatePath("/dashboard", "layout");
  return { success: true, archived: board.isActive };
}

export async function deleteBoard(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const boardId = formData.get("boardId") as string;
  const workspaceId = formData.get("workspaceId") as string;

  try {
    await requireMembershipWithPerms(
      session.user.id,
      workspaceId,
      Permission.DELETE_CONTENT
    );
  } catch {
    return { error: "You don't have permission to delete boards" };
  }

  await prisma.board.delete({ where: { id: boardId } });

  revalidatePath("/dashboard", "layout");
  redirect(`/dashboard/workspaces/${workspaceId}/boards`);
}
