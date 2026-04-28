"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hasPermission, getEffectivePermissions, Permission } from "@/lib/permissions";

async function requireMemberWithPerms(
  userId: string,
  workspaceId: string,
  perm: number
) {
  const m = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
    include: { role: true, workspace: { select: { createdById: true } } },
  });
  if (!m) throw new Error("Not a member");
  const perms = getEffectivePermissions(m.role.permissions, userId, m.workspace.createdById);
  if (!hasPermission(perms, perm))
    throw new Error("Insufficient permissions");
  return m;
}

function revalidateSprint(workspaceId: string, sprintId?: string) {
  revalidatePath(`/w/${workspaceId}/s`);
  if (sprintId) {
    revalidatePath(`/w/${workspaceId}/s/${sprintId}`);
  }
  revalidatePath(`/w/${workspaceId}`);
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

  redirect(`/w/${workspaceId}/s/${sprint.id}`);
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

  redirect(`/w/${workspaceId}/s`);
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

// ─── Migrate (carry over incomplete tasks to a new sprint) ──────────────────

export async function migrateSprint(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const sourceSprintId = formData.get("sourceSprintId") as string;
  const workspaceId = formData.get("workspaceId") as string;
  const title = formData.get("title") as string;

  if (!sourceSprintId || !workspaceId || !title?.trim()) {
    return { error: "Sprint title is required" };
  }

  try {
    await requireMemberWithPerms(
      session.user.id,
      workspaceId,
      Permission.EDIT_CONTENT,
    );
  } catch {
    return { error: "No permission" };
  }

  const source = await prisma.sprint.findUnique({
    where: { id: sourceSprintId },
    select: { workspaceId: true },
  });

  if (!source || source.workspaceId !== workspaceId) {
    return { error: "Sprint not found" };
  }

  // Find all non-completed tasks in the source sprint
  const incompleteTasks = await prisma.task.findMany({
    where: {
      sprints: { some: { id: sourceSprintId } },
      status: { not: "COMPLETED" },
    },
    select: { id: true },
  });

  // Create a new sprint, connecting incomplete tasks if any exist
  const newSprint = await prisma.sprint.create({
    data: {
      title: title.trim(),
      workspaceId,
      ...(incompleteTasks.length > 0 && {
        tasks: {
          connect: incompleteTasks.map((t) => ({ id: t.id })),
        },
      }),
    },
  });

  revalidateSprint(workspaceId, sourceSprintId);
  revalidateSprint(workspaceId, newSprint.id);

  redirect(`/w/${workspaceId}/s/${newSprint.id}`);
}
