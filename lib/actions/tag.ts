"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { hasPermission, Permission } from "@/lib/permissions";

async function requireMember(userId: string, workspaceId: string, perm: number) {
  const m = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
    include: { role: true },
  });
  if (!m) throw new Error("Not a member");
  if (!hasPermission(m.role.permissions, perm)) throw new Error("No permission");
  return m;
}

function revalidateWorkspace(workspaceId: string) {
  revalidatePath(`/dashboard/workspaces/${workspaceId}`);
  revalidatePath(`/dashboard/workspaces/${workspaceId}/boards`);
}

export async function createTag(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const workspaceId = formData.get("workspaceId") as string;
  const name = formData.get("name") as string;
  const color = (formData.get("color") as string) || "#6B7280";

  if (!workspaceId || !name?.trim()) {
    return { error: "Tag name is required" };
  }

  try {
    await requireMember(session.user.id, workspaceId, Permission.CREATE_CONTENT);
  } catch {
    return { error: "No permission" };
  }

  const existing = await prisma.tag.findUnique({
    where: { workspaceId_name: { workspaceId, name: name.trim() } },
  });
  if (existing) return { error: "A tag with this name already exists" };

  await prisma.tag.create({
    data: {
      name: name.trim(),
      color,
      workspaceId,
    },
  });

  revalidateWorkspace(workspaceId);
  return { success: true };
}

export async function updateTag(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const tagId = formData.get("tagId") as string;
  const workspaceId = formData.get("workspaceId") as string;
  const name = formData.get("name") as string;
  const color = (formData.get("color") as string) || "#6B7280";

  if (!tagId || !name?.trim()) return { error: "Tag name is required" };

  try {
    await requireMember(session.user.id, workspaceId, Permission.EDIT_CONTENT);
  } catch {
    return { error: "No permission" };
  }

  // Check for name conflict
  const existing = await prisma.tag.findFirst({
    where: { workspaceId, name: name.trim(), NOT: { id: tagId } },
  });
  if (existing) return { error: "A tag with this name already exists" };

  await prisma.tag.update({
    where: { id: tagId },
    data: { name: name.trim(), color },
  });

  revalidateWorkspace(workspaceId);
  return { success: true };
}

export async function deleteTag(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const tagId = formData.get("tagId") as string;
  const workspaceId = formData.get("workspaceId") as string;

  try {
    await requireMember(session.user.id, workspaceId, Permission.DELETE_CONTENT);
  } catch {
    return { error: "No permission" };
  }

  await prisma.tag.delete({ where: { id: tagId } });

  revalidateWorkspace(workspaceId);
  return { success: true };
}

export async function setTaskTags(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const taskId = formData.get("taskId") as string;
  const workspaceId = formData.get("workspaceId") as string;
  const tagIds = formData.getAll("tagIds") as string[];

  if (!taskId) return { error: "Invalid request" };

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { board: { select: { workspaceId: true, id: true } } },
  });
  if (!task) return { error: "Task not found" };

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: { userId: session.user.id, workspaceId: task.board.workspaceId },
    },
  });
  if (!membership) return { error: "Not a member" };

  await prisma.task.update({
    where: { id: taskId },
    data: { tags: { set: tagIds.map((id) => ({ id })) } },
  });

  revalidatePath(`/dashboard/workspaces/${workspaceId}/boards/${task.board.id}`);
  revalidatePath(
    `/dashboard/workspaces/${workspaceId}/boards/${task.board.id}/tasks/${taskId}`
  );
  revalidatePath(`/dashboard/workspaces/${workspaceId}/boards`);
  return { success: true };
}
