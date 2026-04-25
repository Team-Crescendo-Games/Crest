import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  TASK_STATUSES as STATUS_ORDER,
  STATUS_LABELS,
  STATUS_COLORS,
} from "@/lib/task-enums";
import { KanbanBoard } from "@/components/kanban-board";
import { UserAvatar } from "@/components/user-avatar";

export default async function MemberTasksPage({
  params,
}: {
  params: Promise<{ workspaceId: string; memberId: string }>;
}) {
  const { workspaceId, memberId } = await params;
  const session = await auth();
  const userId = session!.user!.id!;

  // Verify the current user is a member of this workspace
  const currentMembership = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });
  if (!currentMembership) notFound();

  // Fetch the target member
  const member = await prisma.workspaceMember.findUnique({
    where: { id: memberId },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
      role: { select: { name: true, color: true } },
    },
  });

  if (!member || member.workspaceId !== workspaceId) notFound();

  // Fetch tasks assigned to this member within this workspace
  const [assignedTasks, boards, sprints, allMembers, allTags] = await Promise.all([
    prisma.task.findMany({
      where: {
        assignees: { some: { id: member.user.id } },
        board: { workspaceId },
      },
      orderBy: { createdAt: "desc" },
      include: {
        assignees: { select: { id: true, name: true, image: true } },
        tags: { select: { name: true, color: true } },
        board: { select: { id: true, name: true } },
        _count: { select: { comments: true } },
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
    prisma.workspaceMember.findMany({
      where: { workspaceId },
      select: { user: { select: { id: true, name: true, email: true, image: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.tag.findMany({
      where: { workspaceId },
      select: { id: true, name: true, color: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const completedTasks = assignedTasks.filter(
    (t) => t.status === "COMPLETED",
  ).length;
  const totalPoints = assignedTasks.reduce(
    (sum, t) => sum + (t.points ?? 0),
    0,
  );

  const columns = STATUS_ORDER.map((status) => ({
    status,
    label: STATUS_LABELS[status],
    color: STATUS_COLORS[status],
    tasks: assignedTasks
      .filter((t) => t.status === status)
      .map((t) => ({
        ...t,
        boardId: t.board.id,
        commentCount: t._count.comments,
      })),
  }));

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href={`/dashboard/workspaces/${workspaceId}/team`}
        className="mb-6 inline-flex items-center gap-1.5 text-xs text-fg-muted transition-colors hover:text-fg-secondary"
      >
        <ArrowLeft size={12} />
        Back to team
      </Link>

      {/* Member header */}
      <div className="flex items-center gap-4">
        <UserAvatar
          name={member.user.name}
          image={member.user.image}
          size={48}
        />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-mono text-lg font-semibold text-fg-primary">
              {member.user.name}
            </h1>
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{
                backgroundColor: member.role.color + "20",
                color: member.role.color,
              }}
            >
              {member.role.name}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-fg-muted">{member.user.email}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        <StatCard label="Assigned" value={assignedTasks.length} barColor="#f0a468" />
        <StatCard label="Completed" value={completedTasks} barColor="#6bc96b" />
        <StatCard label="Points" value={totalPoints} barColor="#9c9c98" />
      </div>

      {/* Tasks kanban */}
      <div className="mt-8">
        <h2 className="font-mono text-sm font-medium text-fg-primary">
          Tasks
        </h2>
        <div className="mt-1 h-px w-8 bg-accent-subtle" />

        <div className="mt-4">
          {assignedTasks.length === 0 ? (
            <p className="py-8 text-center text-xs text-fg-muted">
              No tasks assigned to {member.user.name} in this workspace.
            </p>
          ) : (
            <KanbanBoard
              columns={columns}
              boardId=""
              workspaceId={workspaceId}
              canCreate={boards.length > 0}
              variant="detailed"
              boards={boards}
              assigneeId={member.user.id}
              sprints={sprints}
              members={allMembers.map((m) => m.user)}
              tags={allTags}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  barColor,
}: {
  label: string;
  value: number;
  barColor: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-md border border-border bg-bg-elevated/60 backdrop-blur-sm">
      <div
        className="absolute left-0 top-0 h-full w-1"
        style={{ backgroundColor: barColor }}
      />
      <div className="p-4 pl-5">
        <p className="text-[11px] font-medium uppercase tracking-wider text-fg-muted">
          {label}
        </p>
        <p className="mt-1.5 font-mono text-2xl font-semibold text-fg-primary">
          {value}
        </p>
      </div>
    </div>
  );
}
