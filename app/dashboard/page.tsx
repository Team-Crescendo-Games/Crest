import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const [workspaceCount, notifications] = await Promise.all([
    prisma.workspaceMember.count({
      where: { userId },
    }),
    prisma.notification.findMany({
      where: { userId, isRead: false },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { task: { select: { title: true } } },
    }),
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      <div>
        <h1 className="font-mono text-lg font-semibold text-fg-primary">
          Welcome back,{" "}
          <span className="text-accent">{session!.user!.name}</span>
        </h1>
        <p className="mt-1 text-xs text-fg-muted">
          Here&apos;s what&apos;s happening across your workspaces.
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Workspaces"
          value={workspaceCount}
          barColor="#f1c258"
        />
        <StatCard
          label="Unread Notifications"
          value={notifications.length}
          barColor="#f0a468"
        />
      </div>

      {notifications.length > 0 && (
        <div className="mt-8">
          <h2 className="font-mono text-sm font-medium text-fg-primary">
            Recent Notifications
          </h2>
          <div className="mt-1 h-px w-8 bg-accent-subtle" />
          <ul className="mt-3 space-y-2">
            {notifications.map((notification) => (
              <li
                key={notification.id}
                className="rounded-md border border-border bg-bg-elevated/60 p-3 backdrop-blur-sm transition-colors hover:border-accent-subtle/30"
              >
                <p className="text-xs text-fg-secondary">
                  {notification.message}
                </p>
                {notification.task && (
                  <p className="mt-1 font-mono text-[11px] text-accent">
                    → {notification.task.title}
                  </p>
                )}
                <p className="mt-1 text-[11px] text-fg-muted">
                  {notification.createdAt.toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
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
