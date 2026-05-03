"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Permission } from "@/lib/permissions";
import { requireMemberWithPermission } from "@/lib/actions/auth-helpers";
import { revalidateWorkspace, revalidateTask } from "@/lib/actions/revalidation-helpers";
import { parseFormData } from "@/lib/validations/helpers";
import { createTagSchema, updateTagSchema, deleteTagSchema, setTaskTagsSchema } from "@/lib/validations/tag";

export async function createTag(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const parsed = parseFormData(createTagSchema, formData);
  if (!parsed.success) return { error: parsed.error };
  const { workspaceId, name, color } = parsed.data;

  try {
    await requireMemberWithPermission(session.user.id, workspaceId, Permission.CREATE_CONTENT);
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

  const parsed = parseFormData(updateTagSchema, formData);
  if (!parsed.success) return { error: parsed.error };
  const { tagId, workspaceId, name, color } = parsed.data;

  try {
    await requireMemberWithPermission(session.user.id, workspaceId, Permission.EDIT_CONTENT);
  } catch {
    return { error: "No permission" };
  }

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

  const parsed = parseFormData(deleteTagSchema, formData);
  if (!parsed.success) return { error: parsed.error };
  const { tagId, workspaceId } = parsed.data;

  try {
    await requireMemberWithPermission(session.user.id, workspaceId, Permission.DELETE_CONTENT);
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

  const parsed = parseFormData(setTaskTagsSchema, formData, ["tagIds"]);
  if (!parsed.success) return { error: parsed.error };
  const { taskId, workspaceId, tagIds } = parsed.data;

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

  revalidateTask(workspaceId, task.board.id, taskId);
  return { success: true };
}
