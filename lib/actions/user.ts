"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

export async function updateProfile(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const name = formData.get("name") as string;

  if (!name?.trim()) {
    return { error: "Name is required" };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name: name.trim() },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
  return { success: true };
}

export async function updateEmail(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email?.trim()) return { error: "Email is required" };
  if (!password) return { error: "Current password is required to change email" };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user?.password) {
    return { error: "Cannot verify identity — no password set" };
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return { error: "Incorrect password" };

  // Check if email is already taken
  const existing = await prisma.user.findUnique({
    where: { email: email.trim() },
  });
  if (existing && existing.id !== session.user.id) {
    return { error: "This email is already in use" };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { email: email.trim() },
  });

  revalidatePath("/dashboard/profile");
  return { success: true, message: "Email updated" };
}

export async function changePassword(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!currentPassword || !newPassword) {
    return { error: "All fields are required" };
  }

  if (newPassword.length < 8) {
    return { error: "New password must be at least 8 characters" };
  }

  if (newPassword !== confirmPassword) {
    return { error: "Passwords do not match" };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user?.password) {
    return { error: "Cannot verify identity — no password set" };
  }

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) return { error: "Current password is incorrect" };

  const hashed = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: session.user.id },
    data: { password: hashed },
  });

  return { success: true, message: "Password changed" };
}

export async function updateProfilePicture(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const imageUrl = formData.get("imageUrl") as string;

  if (!imageUrl) return { error: "Image URL is required" };

  await prisma.user.update({
    where: { id: session.user.id },
    data: { image: imageUrl },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
  return { success: true };
}
