"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Permission } from "@/lib/permissions";
import { requireMemberWithPermission } from "@/lib/actions/auth-helpers";
import { revalidateWorkspace, revalidateDashboard } from "@/lib/actions/revalidation-helpers";

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
    await requireMemberWithPermission(
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

  revalidateDashboard();
  redirect(`/w/${workspaceId}`);
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
    await requireMemberWithPermission(
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

  revalidatePath(`/w/${workspaceId}/b/${boardId}`);
  return { success: true };
}

export async function archiveBoard(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const boardId = formData.get("boardId") as string;
  const workspaceId = formData.get("workspaceId") as string;

  try {
    await requireMemberWithPermission(
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

  revalidateWorkspace(workspaceId);
  revalidateDashboard();
  return { success: true, archived: board.isActive };
}

export async function deleteBoard(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const boardId = formData.get("boardId") as string;
  const workspaceId = formData.get("workspaceId") as string;

  try {
    await requireMemberWithPermission(
      session.user.id,
      workspaceId,
      Permission.DELETE_CONTENT
    );
  } catch {
    return { error: "You don't have permission to delete boards" };
  }

  await prisma.board.delete({ where: { id: boardId } });

  revalidateDashboard();
  redirect(`/w/${workspaceId}/b`);
}
