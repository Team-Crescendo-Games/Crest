import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

/**
 * GET /t/[taskId]
 * Short-link redirect: looks up the task and redirects to its full URL.
 */
export async function GET(_: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { boardId: true, board: { select: { workspaceId: true } } },
  });

  if (!task) {
    redirect("/dashboard");
  }

  redirect(`/w/${task.board.workspaceId}/b/${task.boardId}/t/${taskId}`);
}
