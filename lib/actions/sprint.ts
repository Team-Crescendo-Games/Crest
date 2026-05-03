"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Permission } from "@/lib/permissions";
import { requireMemberWithPermission } from "@/lib/actions/auth-helpers";
import { revalidateSprint } from "@/lib/actions/revalidation-helpers";
import { parseFormData } from "@/lib/validations/helpers";
import {
  createSprintSchema,
  updateSprintSchema,
  toggleSprintActiveSchema,
  deleteSprintSchema,
  assignTaskToSprintSchema,
  removeTaskFromSprintSchema,
  migrateSprintSchema,
} from "@/lib/validations/sprint";

// ─── Create ─────────────────────────────────────────────────────────────────

export async function createSprint(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const parsed = parseFormData(createSprintSchema, formData);
  if (!parsed.success) return { error: parsed.error };
  const { workspaceId, title, startDate, endDate } = parsed.data;

  try {
    await requireMemberWithPermission(
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

  const parsed = parseFormData(updateSprintSchema, formData);
  if (!parsed.success) return { error: parsed.error };
  const { sprintId, workspaceId, title, startDate, endDate } = parsed.data;

  try {
    await requireMemberWithPermission(
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

  const parsed = parseFormData(toggleSprintActiveSchema, formData);
  if (!parsed.success) return { error: parsed.error };
  const { sprintId, workspaceId } = parsed.data;

  try {
    await requireMemberWithPermission(
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

  const parsed = parseFormData(deleteSprintSchema, formData);
  if (!parsed.success) return { error: parsed.error };
  const { sprintId, workspaceId } = parsed.data;

  try {
    await requireMemberWithPermission(
      session.user.id,
      workspaceId,
      Permission.DELETE_CONTENT
    );
  } catch {
    return { error: "No permission" };
  }

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

  const parsed = parseFormData(assignTaskToSprintSchema, formData);
  if (!parsed.success) return { error: parsed.error };
  const { sprintId, taskId, workspaceId } = parsed.data;

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

  const parsed = parseFormData(removeTaskFromSprintSchema, formData);
  if (!parsed.success) return { error: parsed.error };
  const { sprintId, taskId, workspaceId } = parsed.data;

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

  const parsed = parseFormData(migrateSprintSchema, formData);
  if (!parsed.success) return { error: parsed.error };
  const { sourceSprintId, workspaceId, title } = parsed.data;

  try {
    await requireMemberWithPermission(
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

  const incompleteTasks = await prisma.task.findMany({
    where: {
      sprints: { some: { id: sourceSprintId } },
      status: { not: "COMPLETED" },
    },
    select: { id: true },
  });

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
