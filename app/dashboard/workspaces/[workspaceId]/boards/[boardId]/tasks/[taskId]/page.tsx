import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Calendar, User, Clock } from "lucide-react";
import { TaskEditForm } from "./task-edit-form";
import { CommentSection } from "./comment-section";
import { AttachmentSection } from "@/components/attachment-section";

const STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  COMPLETED: "Completed",
};

const STATUS_COLORS: Record<string, string> = {
  NOT_STARTED: "#9c9c98",
  IN_PROGRESS: "#f1c258",
  IN_REVIEW: "#f0a468",
  COMPLETED: "#6bc96b",
};

const PRIORITY_LABELS: Record<string, string> = {
  NONE: "None",
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

const PRIORITY_COLORS: Record<string, string> = {
  NONE: "#9c9c98",
  LOW: "#6bc96b",
  MEDIUM: "#f1c258",
  HIGH: "#f0a468",
  URGENT: "#ef4444",
};

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
      author: { select: { id: true, name: true, email: true } },
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

          {/* Comments */}
          <div className="mt-8">
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
            <div className="flex items-center gap-1.5 text-[11px] text-fg-muted">
              <User size={10} />
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
                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-accent/10 text-[9px] font-bold text-accent">
                      {a.name?.charAt(0)?.toUpperCase()}
                    </div>
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

          {/* Sprints */}
          {task.sprints.length > 0 && (
            <MetaBlock label="Sprints">
              <div className="space-y-1">
                {task.sprints.map((s) => (
                  <span key={s.id} className="block text-[11px] text-fg-muted">
                    {s.title}
                  </span>
                ))}
              </div>
            </MetaBlock>
          )}

          {/* Timestamps */}
          <MetaBlock label="Created">
            <span className="text-[11px] text-fg-muted">
              {task.createdAt.toLocaleDateString()} at{" "}
              {task.createdAt.toLocaleTimeString()}
            </span>
          </MetaBlock>

          <MetaBlock label="Updated">
            <span className="text-[11px] text-fg-muted">
              {task.updatedAt.toLocaleDateString()} at{" "}
              {task.updatedAt.toLocaleTimeString()}
            </span>
          </MetaBlock>
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
