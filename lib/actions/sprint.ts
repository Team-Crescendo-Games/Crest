"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hasPermission, Permission } from "@/lib/permissions";

async function requireMemberWithPerms(
  userId: string,
  workspaceId: string,
  perm: number
) {
  const m = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
    include: { role: true },
  });
  if (!m) throw new Error("Not a member");
  if (!hasPermission(m.role.permissions, perm))
    throw new Error("Insufficient permissions");
  return m;
}

function revalidateSprint(workspaceId: string, sprintId?: string) {
  revalidatePath(`/dashboard/workspaces/${workspaceId}/sprints`);
  if (sprintId) {
    revalidatePath(
      `/dashboard/workspaces/${workspaceId}/sprints/${sprintId}`
    );
  }
  revalidatePath(`/dashboard/workspaces/${workspaceId}`);
}

// ─── Create ─────────────────────────────────────────────────────────────────

export async function createSprint(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const workspaceId = formData.get("workspaceId") as string;
  const title = formData.get("title") as string;
  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string;

  if (!workspaceId || !title?.trim()) {
    return { error: "Sprint title is required" };
  }

  try {
    await requireMemberWithPerms(
      session.user.id,
      workspaceId,
      Permission.CREATE_CONTENT
    );
  } catch {
    return { error: "You don't have permission to create sprints" };
  }

  const sprint = await prisma.sprint.create({
    data: {
      title: title.trim(),
      workspaceId,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    },
  });

  redirect(`/dashboard/workspaces/${workspaceId}/sprints/${sprint.id}`);
}

// ─── Update ─────────────────────────────────────────────────────────────────

export async function updateSprint(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const sprintId = formData.get("sprintId") as string;
  const workspaceId = formData.get("workspaceId") as string;
  const title = formData.get("title") as string;
  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string;

  if (!sprintId || !title?.trim()) return { error: "Sprint title is required" };

  try {
    await requireMemberWithPerms(
      session.user.id,
      workspaceId,
      Permission.EDIT_CONTENT
    );
  } catch {
    return { error: "No permission" };
  }

  await prisma.sprint.update({
    where: { id: sprintId },
    data: {
      title: title.trim(),
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    },
  });

  revalidateSprint(workspaceId, sprintId);
  return { success: true };
}

// ─── Toggle active ──────────────────────────────────────────────────────────

export async function toggleSprintActive(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const sprintId = formData.get("sprintId") as string;
  const workspaceId = formData.get("workspaceId") as string;

  try {
    await requireMemberWithPerms(
      session.user.id,
      workspaceId,
      Permission.EDIT_CONTENT
    );
  } catch {
    return { error: "No permission" };
  }

  const sprint = await prisma.sprint.findUnique({
    where: { id: sprintId },
    select: { isActive: true },
  });
  if (!sprint) return { error: "Sprint not found" };

  await prisma.sprint.update({
    where: { id: sprintId },
    data: { isActive: !sprint.isActive },
  });

  revalidateSprint(workspaceId, sprintId);
  return { success: true, isActive: !sprint.isActive };
}

// ─── Delete ─────────────────────────────────────────────────────────────────

export async function deleteSprint(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const sprintId = formData.get("sprintId") as string;
  const workspaceId = formData.get("workspaceId") as string;

  try {
    await requireMemberWithPerms(
      session.user.id,
      workspaceId,
      Permission.DELETE_CONTENT
    );
  } catch {
    return { error: "No permission" };
  }

  // Disconnect tasks (don't delete them — they belong to boards)
  await prisma.sprint.update({
    where: { id: sprintId },
    data: { tasks: { set: [] } },
  });

  await prisma.sprint.delete({ where: { id: sprintId } });

  redirect(`/dashboard/workspaces/${workspaceId}/sprints`);
}

// ─── Assign / unassign tasks ────────────────────────────────────────────────

export async function assignTaskToSprint(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const sprintId = formData.get("sprintId") as string;
  const taskId = formData.get("taskId") as string;
  const workspaceId = formData.get("workspaceId") as string;

  if (!sprintId || !taskId) return { error: "Invalid request" };

  const sprint = await prisma.sprint.findUnique({
    where: { id: sprintId },
    select: { workspaceId: true },
  });
  if (!sprint) return { error: "Sprint not found" };

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: { userId: session.user.id, workspaceId: sprint.workspaceId },
    },
  });
  if (!membership) return { error: "Not a member" };

  await prisma.sprint.update({
    where: { id: sprintId },
    data: { tasks: { connect: { id: taskId } } },
  });

  revalidateSprint(workspaceId, sprintId);
  return { success: true };
}

export async function removeTaskFromSprint(
  _prev: unknown,
  formData: FormData
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const sprintId = formData.get("sprintId") as string;
  const taskId = formData.get("taskId") as string;
  const workspaceId = formData.get("workspaceId") as string;

  if (!sprintId || !taskId) return { error: "Invalid request" };

  const sprint = await prisma.sprint.findUnique({
    where: { id: sprintId },
    select: { workspaceId: true },
  });
  if (!sprint) return { error: "Sprint not found" };

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: { userId: session.user.id, workspaceId: sprint.workspaceId },
    },
  });
  if (!membership) return { error: "Not a member" };

  await prisma.sprint.update({
    where: { id: sprintId },
    data: { tasks: { disconnect: { id: taskId } } },
  });

  revalidateSprint(workspaceId, sprintId);
  return { success: true };
}
