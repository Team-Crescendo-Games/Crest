import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Calendar, Clock } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { TaskEditForm } from "./task-edit-form";
import { CommentSection } from "./comment-section";
import { ActivityLog } from "./activity-log";
import { AttachmentSection } from "@/components/attachment-section";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
} from "@/lib/task-enums";

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

  // Get workspace members for assignee picker
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return (
    <div className="relative">
      <div className="mx-auto max-w-3xl">
        <div className="grid gap-6 lg:grid-cols-[1fr_240px]">
        {/* Main content */}
        <div>
          <TaskEditForm
            task={{
              id: task.id,
              title: task.title,
              description: task.description,
              status: task.status,
              priority: task.priority,
              startDate: task.startDate?.toISOString().split("T")[0] ?? "",
              dueDate: task.dueDate?.toISOString().split("T")[0] ?? "",
              points: task.points,
              assigneeIds: task.assignees.map((a) => a.id),
              tagIds: task.tags.map((t) => t.id),
            }}
            members={members.map((m) => m.user)}
            tags={await prisma.tag.findMany({
              where: { workspaceId },
              select: { id: true, name: true, color: true },
              orderBy: { name: "asc" },
            })}
            workspaceId={workspaceId}
            boardId={boardId}
          />

          {/* Subtasks */}
          {task.subtasks.length > 0 && (
            <div className="mt-6">
              <h3 className="font-mono text-xs font-medium text-fg-secondary">
                Subtasks
              </h3>
              <div className="mt-2 space-y-1">
                {task.subtasks.map((sub) => (
                  <Link
                    key={sub.id}
                    href={`/dashboard/workspaces/${workspaceId}/boards/${boardId}/tasks/${sub.id}`}
                    className="flex items-center gap-2 rounded-md border border-border bg-bg-elevated/60 px-3 py-2 text-xs transition-colors hover:border-accent/30"
                  >
                    <div
                      className="h-1.5 w-1.5 rounded-full"
                      style={{
                        backgroundColor: STATUS_COLORS[sub.status] ?? "#9c9c98",
                      }}
                    />
                    <span className="text-fg-primary">{sub.title}</span>
                    <span className="ml-auto text-[11px] text-fg-muted">
                      {STATUS_LABELS[sub.status]}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Attachments */}
          <div className="mt-8">
            <AttachmentSection taskId={taskId} attachments={task.attachments} />
          </div>

          {/* Activities */}
          {task.activities.length > 0 && (
            <ActivityLog activities={task.activities} />
          )}
        </div>

        {/* Sidebar metadata */}
        <div className="space-y-4">
          {/* Status */}
          <MetaBlock label="Status">
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{
                backgroundColor: STATUS_COLORS[task.status] + "20",
                color: STATUS_COLORS[task.status],
              }}
            >
              {STATUS_LABELS[task.status]}
            </span>
          </MetaBlock>

          {/* Priority */}
          <MetaBlock label="Priority">
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{
                backgroundColor: PRIORITY_COLORS[task.priority] + "20",
                color: PRIORITY_COLORS[task.priority],
              }}
            >
              {PRIORITY_LABELS[task.priority]}
            </span>
          </MetaBlock>

          {/* Points */}
          {task.points !== null && (
            <MetaBlock label="Points">
              <span className="font-mono text-xs text-fg-primary">
                {task.points}
              </span>
            </MetaBlock>
          )}

          {/* Dates */}
          {(task.startDate || task.dueDate) && (
            <MetaBlock label="Dates">
              <div className="space-y-1 text-[11px] text-fg-muted">
                {task.startDate && (
                  <div className="flex items-center gap-1">
                    <Calendar size={10} />
                    Start: {task.startDate.toLocaleDateString()}
                  </div>
                )}
                {task.dueDate && (
                  <div className="flex items-center gap-1">
                    <Clock size={10} />
                    Due: {task.dueDate.toLocaleDateString()}
                  </div>
                )}
              </div>
            </MetaBlock>
          )}

          {/* Author */}
          <MetaBlock label="Author">
            <div className="flex items-center gap-1.5 text-[11px] text-fg-primary">
              <UserAvatar name={task.author.name} image={task.author.image} size={18} />
              {task.author.name}
            </div>
          </MetaBlock>

          {/* Assignees */}
          <MetaBlock label="Assignees">
            {task.assignees.length === 0 ? (
              <span className="text-[11px] text-fg-muted">Unassigned</span>
            ) : (
              <div className="space-y-1">
                {task.assignees.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-1.5 text-[11px] text-fg-primary"
                  >
                    <UserAvatar name={a.name} image={a.image} size={18} />
                    {a.name}
                  </div>
                ))}
              </div>
            )}
          </MetaBlock>

          {/* Tags */}
          {task.tags.length > 0 && (
            <MetaBlock label="Tags">
              <div className="flex flex-wrap gap-1">
                {task.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="rounded-full border px-1.5 py-0.5 text-[10px]"
                    style={{
                      borderColor: (tag.color ?? "#6B7280") + "40",
                      color: tag.color ?? "#6B7280",
                    }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            </MetaBlock>
          )}

          {/* Board */}
          <MetaBlock label="Board">
            <Link
              href={`/dashboard/workspaces/${workspaceId}/boards/${boardId}`}
              className="text-[11px] text-accent hover:text-accent-emphasis transition-colors"
            >
              {task.board.name}
            </Link>
          </MetaBlock>

          {/* Sprints */}
          {task.sprints.length > 0 && (
            <MetaBlock label="Sprints">
              <div className="space-y-1">
                {task.sprints.map((s) => (
                  <Link
                    key={s.id}
                    href={`/dashboard/workspaces/${workspaceId}/sprints/${s.id}`}
                    className="block text-[11px] text-accent hover:text-accent-emphasis transition-colors"
                  >
                    {s.title}
                  </Link>
                ))}
              </div>
            </MetaBlock>
          )}

          {/* Timestamps */}
          <div className="opacity-40">
            <MetaBlock label="Created">
              <span className="text-[11px] text-fg-muted">
                {task.createdAt.toLocaleDateString()} at{" "}
                {task.createdAt.toLocaleTimeString()}
              </span>
            </MetaBlock>
          </div>

          <div className="opacity-40">
            <MetaBlock label="Updated">
              <span className="text-[11px] text-fg-muted">
                {task.updatedAt.toLocaleDateString()} at{" "}
                {task.updatedAt.toLocaleTimeString()}
              </span>
            </MetaBlock>
          </div>
        </div>
        </div>{/* end grid */}

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
      </div>{/* end max-w-3xl */}

      {/* Comments — floating panel on wide screens */}
      <div className="absolute right-0 top-0 hidden w-72 xl:block" style={{ transform: "translateX(calc(100% + 3rem))" }}>
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

function MetaBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-fg-muted">
        {label}
      </p>
      {children}
    </div>
  );
}
