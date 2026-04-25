import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/notifications?skip=0&take=10
 * Returns paginated notifications for the current user.
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const skip = Math.max(0, parseInt(searchParams.get("skip") ?? "0", 10));
  const take = Math.min(50, Math.max(1, parseInt(searchParams.get("take") ?? "10", 10)));

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        task: {
          select: {
            id: true,
            title: true,
            board: { select: { id: true, workspaceId: true } },
          },
        },
      },
    }),
    prisma.notification.count({ where: { userId: session.user.id } }),
  ]);

  return NextResponse.json({ notifications, total });
}
