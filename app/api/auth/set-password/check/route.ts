import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/auth/set-password/check
 * Checks if an account exists with no password (migrated account).
 */
export async function POST(request: Request) {
  const { email } = await request.json();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, password: true },
  });

  if (!user) {
    return NextResponse.json(
      { error: "No account found with this email" },
      { status: 404 }
    );
  }

  if (user.password) {
    return NextResponse.json(
      { error: "This account already has a password. Use the sign-in page." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
