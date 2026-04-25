import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

/**
 * POST /api/auth/set-password
 * Sets a password for a migrated account that has none.
 * Only works if the account currently has no password.
 */
export async function POST(request: Request) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, password: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  // Only allow setting a password if none exists (migrated accounts)
  if (user.password) {
    return NextResponse.json(
      { error: "This account already has a password" },
      { status: 400 }
    );
  }

  const hashed = await bcrypt.hash(password, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed },
  });

  return NextResponse.json({ ok: true });
}
