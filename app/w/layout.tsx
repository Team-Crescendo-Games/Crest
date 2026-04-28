import { redirect } from "next/navigation";
import { getSession } from "@/lib/cached-auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/sidebar";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

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
            select: { id: true, name: true, isActive: true },
            orderBy: { displayOrder: "asc" },
          },
          sprints: {
            select: { id: true, title: true, isActive: true, startDate: true },
            orderBy: { startDate: "desc" },
          },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  const workspaces = memberships.map((m) => m.workspace);

  return (
    <div className="flex min-h-screen">
      <Sidebar user={session.user} workspaces={workspaces} />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
