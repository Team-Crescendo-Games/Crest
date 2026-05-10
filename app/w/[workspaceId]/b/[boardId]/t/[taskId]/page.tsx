import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { TaskEditForm } from "@/components/tasks/task-edit-form";
import { TaskBreadcrumb } from "@/components/tasks/task-breadcrumb";
import { CommentSection } from "@/components/tasks/comment-section";
import { ActivityLog } from "@/components/tasks/activity-log";
import { AttachmentSection } from "@/components/workspace/attachment-section";
import { SubtaskSection } from "@/components/workspace/subtask-section";
import { ParentTaskSection } from "@/components/workspace/parent-task-section";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ workspaceId: string; boardId: string; taskId: string }>;
}) {
  const { workspaceId, boardId, taskId } = await params;
  const session = await auth();
  const userId = session!.user!.id!;

  // Run all independent queries in parallel
  const [
    membership,
    task,
    members,
    boards,
    sprints,
    allTags,
    allBoardsForActivity,
    allSprintsForActivity,
  ] = await Promise.all([
    prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
      include: { role: true },
    }),
    prisma.task.findUnique({
      where: { id: taskId },
      include: {
        board: { select: { name: true, workspaceId: true } },
        author: {
          select: { id: true, name: true, email: true, image: true },
        },
        assignees: {
          select: { id: true, name: true, email: true, image: true },
        },
        tags: { select: { id: true, name: true, color: true } },
        sprints: { select: { id: true, title: true } },
        parentTask: { select: { id: true, title: true, boardId: true, status: true } },
        subtasks: {
          select: { id: true },
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
    }),
    prisma.workspaceMember.findMany({
      where: { workspaceId },
      select: {
        id: true,
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    }),
    prisma.board.findMany({
      where: { workspaceId, isActive: true },
      select: { id: true, name: true },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.sprint.findMany({
      where: { workspaceId, isActive: true },
      select: { id: true, title: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.tag.findMany({
      where: { workspaceId },
      select: { id: true, name: true, color: true },
      orderBy: { name: "asc" },
    }),
    // Lookup maps include inactive records so historical activity entries
    // can still resolve names for boards/sprints that have since been archived.
    prisma.board.findMany({
      where: { workspaceId },
      select: { id: true, name: true },
    }),
    prisma.sprint.findMany({
      where: { workspaceId },
      select: { id: true, title: true },
    }),
  ]);

  if (!membership) notFound();

  if (!task || task.board.workspaceId !== workspaceId || task.boardId !== boardId) {
    notFound();
  }

  const memberIdMap: Record<string, string> = {};
  for (const m of members) {
    memberIdMap[m.user.id] = m.id;
  }

  return (
    <div className="relative">
      <div className="mx-auto max-w-3xl">
        {/* Breadcrumb */}
        <TaskBreadcrumb boardName={task.board.name} boardHref={`/w/${workspaceId}/b/${boardId}`} />

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
          taskSprints={task.sprints}
          workspaceId={workspaceId}
          boardId={boardId}
          authorId={task.author.id}
          authorName={task.author.name}
          authorImage={task.author.image}
          memberIdMap={memberIdMap}
          currentUserId={userId}
        />

        {/* Parent task — styled to match SubtaskSection */}
        {task.parentTask && (
          <ParentTaskSection
            workspaceId={workspaceId}
            parent={task.parentTask}
            childTaskId={taskId}
          />
        )}

        {/* Below the form: subtasks, attachments, activity log */}
        <SubtaskSection
          taskId={taskId}
          boardId={boardId}
          workspaceId={workspaceId}
          subtaskCount={task.subtasks.length}
        />

        <div className="mt-8">
          <AttachmentSection taskId={taskId} attachments={task.attachments} />
        </div>

        <ActivityLog
          activities={task.activities}
          memberNames={Object.fromEntries(members.map((m) => [m.user.id, m.user.name ?? m.user.email ?? "Unknown"]))}
          sprintNames={Object.fromEntries(allSprintsForActivity.map((s) => [s.id, s.title]))}
          boardNames={Object.fromEntries(allBoardsForActivity.map((b) => [b.id, b.name]))}
          tagNames={Object.fromEntries(allTags.map((t) => [t.id, t.name]))}
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
