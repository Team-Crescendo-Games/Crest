import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/sign-in");
  }

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: session.user.id! },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          boards: {
            where: { isActive: true },
            select: { id: true, name: true },
            orderBy: { displayOrder: "asc" },
          },
          sprints: {
            where: { isActive: true },
            select: { id: true, title: true },
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  const workspaces = memberships.map((m) => m.workspace);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={session.user} workspaces={workspaces} />
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
