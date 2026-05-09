"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { parseFormData } from "@/lib/validations/helpers";
import {
  updateProfileSchema,
  updateEmailSchema,
  changePasswordSchema,
  updateProfilePictureSchema,
} from "@/lib/validations/user";

export async function updateProfile(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const parsed = parseFormData(updateProfileSchema, formData);
  if (!parsed.success) return { error: parsed.error };
  const { name } = parsed.data;

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { name: name.trim() },
    });
  } catch (err) {
    console.error(err);
    return { error: "An unexpected error occurred" };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
  return { success: true };
}

export async function updateEmail(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const parsed = parseFormData(updateEmailSchema, formData);
  if (!parsed.success) return { error: parsed.error };
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user?.password) {
    return { error: "Cannot verify identity — no password set" };
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return { error: "Incorrect password" };

  const existing = await prisma.user.findUnique({
    where: { email: email.trim() },
  });
  if (existing && existing.id !== session.user.id) {
    return { error: "This email is already in use" };
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { email: email.trim() },
    });
  } catch (err) {
    console.error(err);
    return { error: "An unexpected error occurred" };
  }

  revalidatePath("/dashboard/profile");
  return { success: true, message: "Email updated" };
}

export async function changePassword(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const parsed = parseFormData(changePasswordSchema, formData);
  if (!parsed.success) return { error: parsed.error };
  const { currentPassword, newPassword } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user?.password) {
    return { error: "Cannot verify identity — no password set" };
  }

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) return { error: "Current password is incorrect" };

  const hashed = await bcrypt.hash(newPassword, 12);

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: hashed },
    });
  } catch (err) {
    console.error(err);
    return { error: "An unexpected error occurred" };
  }

  return { success: true, message: "Password changed" };
}

export async function updateProfilePicture(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const parsed = parseFormData(updateProfilePictureSchema, formData);
  if (!parsed.success) return { error: parsed.error };
  const { imageUrl } = parsed.data;

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { image: imageUrl },
    });
  } catch (err) {
    console.error(err);
    return { error: "An unexpected error occurred" };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
  return { success: true };
}
