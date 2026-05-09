import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPresignedDownloadUrl } from "@/lib/s3";

/**
 * GET /api/profile-picture/[userId]
 * Redirects to a short-lived presigned S3 URL for the user's profile picture.
 * Requires authentication.
 */
export async function GET(_: Request, ctx: RouteContext<"/api/profile-picture/[userId]">) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await ctx.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { image: true },
    });

    if (!user?.image) {
      return NextResponse.json({ error: "No profile picture" }, { status: 404 });
    }

    const url = await getPresignedDownloadUrl(user.image, 900); // 15 min
    return NextResponse.redirect(url);
  } catch (e) {
    console.error("[profile-picture] GET error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Something went wrong" }, { status: 500 });
  }
}
