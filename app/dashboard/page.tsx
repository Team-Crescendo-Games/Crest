import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TaskStatus } from "@/prisma/generated/prisma/enums";
import { KanbanBoard } from "@/components/kanban-board";
import { NotificationFeed } from "./notification-feed";
import { Bell } from "lucide-react";

const STATUS_ORDER: TaskStatus[] = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "IN_REVIEW",
  "COMPLETED",
];

const STATUS_LABELS: Record<TaskStatus, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  COMPLETED: "Completed",
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  NOT_STARTED: "#9c9c98",
  IN_PROGRESS: "#f1c258",
  IN_REVIEW: "#f0a468",
  COMPLETED: "#6bc96b",
};

const NOTIF_PAGE = 10;

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const [workspaceCount, assignedTasks, notifResult] = await Promise.all([
    prisma.workspaceMember.count({ where: { userId } }),
    prisma.task.findMany({
      where: { assignees: { some: { id: userId } } },
      orderBy: { createdAt: "desc" },
      include: {
        assignees: { select: { id: true, name: true, image: true } },
        tags: { select: { name: true, color: true } },
        board: { select: { id: true, name: true, workspaceId: true } },
      },
    }),
    prisma.$transaction([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: NOTIF_PAGE,
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
      prisma.notification.count({ where: { userId } }),
    ]),
  ]);

  const [initialNotifications, totalNotifications] = notifResult;

  const totalPoints = assignedTasks.reduce(
    (sum, t) => sum + (t.points ?? 0),
    0,
  );
  const completedTasks = assignedTasks.filter(
    (t) => t.status === "COMPLETED",
  ).length;
  const unreadCount = initialNotifications.filter((n) => !n.isRead).length;

  const columns = STATUS_ORDER.map((status) => ({
    status,
    label: STATUS_LABELS[status],
    color: STATUS_COLORS[status],
    tasks: assignedTasks
      .filter((t) => t.status === status)
      .map((t) => ({
        ...t,
        boardId: t.board.id,
      })),
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-mono text-lg font-semibold text-fg-primary">
          Welcome back,{" "}
          <span className="text-accent">{session!.user!.name}</span>
        </h1>
        <p className="mt-1 text-xs text-fg-muted">
          Here&apos;s what&apos;s happening across your workspaces.
        </p>
      </div>

      {/* Stats + Notifications row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Stats */}
        <div className="space-y-3">
          <SectionHeading>Overview</SectionHeading>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Workspaces"
              value={workspaceCount}
              barColor="#f1c258"
            />
            <StatCard
              label="Assigned Tasks"
              value={assignedTasks.length}
              barColor="#f0a468"
            />
            <StatCard
              label="Completed"
              value={completedTasks}
              barColor="#6bc96b"
            />
            <StatCard
              label="Total Points"
              value={totalPoints}
              barColor="#9c9c98"
            />
          </div>
        </div>

        {/* Notifications */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <SectionHeading>Notifications</SectionHeading>
            {unreadCount > 0 && (
              <span className="rounded-full bg-accent/15 px-2 py-0.5 font-mono text-[10px] text-accent">
                {unreadCount} unread
              </span>
            )}
          </div>
          <div className="rounded-md border border-border bg-bg-elevated/60 p-3 backdrop-blur-sm max-h-[320px] overflow-y-auto">
            <NotificationFeed
              initial={initialNotifications}
              totalCount={totalNotifications}
            />
          </div>
        </div>
      </div>

      {/* My Tasks kanban */}
      <div className="space-y-3">
        <SectionHeading>My Tasks</SectionHeading>
        {assignedTasks.length === 0 ? (
          <p className="py-8 text-center text-xs text-fg-muted">
            No tasks assigned to you yet.
          </p>
        ) : (
          <KanbanBoard
            columns={columns}
            boardId=""
            workspaceId=""
            canCreate={false}
            variant="detailed"
          />
        )}
      </div>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-mono text-sm font-medium text-fg-primary">
        {children}
      </h2>
      <div className="mt-1 h-px w-8 bg-accent-subtle" />
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
  barColor?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-md border border-border bg-bg-elevated/60 backdrop-blur-sm">
      {barColor && (
        <div
          className="absolute left-0 top-0 h-full w-1"
          style={{ backgroundColor: barColor }}
        />
      )}
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
