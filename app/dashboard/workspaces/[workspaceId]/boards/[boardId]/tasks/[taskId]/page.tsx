import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { TaskEditForm } from "../../../../../../../../components/tasks/task-edit-form";
import { CommentSection } from "../../../../../../../../components/tasks/comment-section";
import { ActivityLog } from "../../../../../../../../components/tasks/activity-log";
import { AttachmentSection } from "@/components/attachment-section";
import { SubtaskSection } from "@/components/subtask-section";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ workspaceId: string; boardId: string; taskId: string }>;
}) {
  const { workspaceId, boardId, taskId } = await params;
  const session = await auth();
  const userId = session!.user!.id!;

  const membership = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
    include: { role: true },
  });

  if (!membership) notFound();

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      board: { select: { name: true, workspaceId: true } },
      author: { select: { id: true, name: true, email: true, image: true } },
      assignees: { select: { id: true, name: true, email: true, image: true } },
      tags: { select: { id: true, name: true, color: true } },
      sprints: { select: { id: true, title: true } },
      parentTask: { select: { id: true, title: true, boardId: true } },
      subtasks: {
        select: { id: true, title: true, status: true },
        orderBy: { createdAt: "asc" },
      },
      comments: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
      attachments: {
        include: { uploadedBy: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
      activities: {
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (
    !task ||
    task.board.workspaceId !== workspaceId ||
    task.boardId !== boardId
  ) {
    notFound();
  }

  const [members, boards, sprints, allTags] = await Promise.all([
    prisma.workspaceMember.findMany({
      where: { workspaceId },
      select: {
        id: true,
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    }),
    prisma.board.findMany({
      where: { workspaceId, isActive: true },
      select: { id: true, name: true },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.sprint.findMany({
      where: { workspaceId },
      select: { id: true, title: true, isActive: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.tag.findMany({
      where: { workspaceId },
      select: { id: true, name: true, color: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // Build userId → workspaceMemberId map for profile links
  const memberIdMap: Record<string, string> = {};
  for (const m of members) {
    memberIdMap[m.user.id] = m.id;
  }

  return (
    <div className="relative">
      <div className="mx-auto max-w-3xl">
        {/* Unified form renders both columns */}
        <TaskEditForm
          task={{
            id: task.id,
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            dueDate: task.dueDate?.toISOString().split("T")[0] ?? "",
            points: task.points,
            assigneeIds: task.assignees.map((a) => a.id),
            tagIds: task.tags.map((t) => t.id),
            boardId: task.boardId,
            sprintIds: task.sprints.map((s) => s.id),
          }}
          members={members.map((m) => m.user)}
          tags={allTags}
          boards={boards}
          sprints={sprints}
          workspaceId={workspaceId}
          boardId={boardId}
          authorId={task.author.id}
          authorName={task.author.name}
          authorImage={task.author.image}
          memberIdMap={memberIdMap}
        />

        {/* Parent task link */}
        {task.parentTask && (
          <div className="mt-6">
            <h3 className="font-mono text-xs font-medium text-fg-secondary">
              Parent Task
            </h3>
            <Link
              href={`/dashboard/workspaces/${workspaceId}/boards/${task.parentTask.boardId}/tasks/${task.parentTask.id}`}
              className="mt-1.5 inline-block text-xs text-accent transition-colors hover:text-accent-emphasis"
            >
              {task.parentTask.title}
            </Link>
          </div>
        )}

        {/* Below the form: subtasks, attachments, activity log */}
        <SubtaskSection
          taskId={taskId}
          boardId={boardId}
          workspaceId={workspaceId}
          subtasks={task.subtasks}
        />

        <div className="mt-8">
          <AttachmentSection taskId={taskId} attachments={task.attachments} />
        </div>

        <ActivityLog
          activities={task.activities}
          createdAt={task.createdAt}
          createdByName={task.author.name}
          memberNames={Object.fromEntries(
            members.map((m) => [
              m.user.id,
              m.user.name ?? m.user.email ?? "Unknown",
            ]),
          )}
        />

        {/* Comments — inline fallback for smaller screens */}
        <div className="mt-8 xl:hidden">
          <CommentSection
            taskId={taskId}
            comments={task.comments.map((c) => ({
              id: c.id,
              text: c.text,
              createdAt: c.createdAt,
              userId: c.user.id,
              userName: c.user.name,
            }))}
            currentUserId={userId}
          />
        </div>
      </div>

      {/* Comments — floating panel on wide screens */}
      <div
        className="absolute right-0 top-0 hidden w-72 xl:block"
        style={{ transform: "translateX(calc(100% + 3rem))" }}
      >
        <div className="sticky top-8 min-w-0 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-md border border-border bg-bg-elevated/60 p-4 shadow-md backdrop-blur-sm">
          <CommentSection
            taskId={taskId}
            comments={task.comments.map((c) => ({
              id: c.id,
              text: c.text,
              createdAt: c.createdAt,
              userId: c.user.id,
              userName: c.user.name,
            }))}
            currentUserId={userId}
          />
        </div>
      </div>
    </div>
  );
}
