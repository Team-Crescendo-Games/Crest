import { getSession } from "@/lib/cached-auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ListChecks } from "lucide-react";
import { TASK_PRIORITIES, TASK_STATUSES, parseSorts } from "@/lib/task-enums";
import { parseMulti } from "@/lib/url-helpers";
import { searchWorkspaceTasksList } from "@/lib/actions/task/search";
import { TaskSearchFilters } from "@/components/tasks/task-search-filters";
import { TaskSearchList } from "@/components/tasks/task-search-list";

const PAGE_SIZE = 25;

interface Props {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<{
    q?: string;
    priority?: string;
    status?: string;
    tag?: string;
    assignee?: string;
    board?: string;
    sprint?: string;
    sort?: string;
    page?: string;
    showArchived?: string;
  }>;
}

export default async function WorkspaceTasksPage({ params, searchParams }: Props) {
  const { workspaceId } = await params;
  const sp = await searchParams;

  const session = await getSession();
  const userId = session!.user!.id!;

  const membership = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
    include: { workspace: { select: { id: true, name: true } } },
  });
  if (!membership) notFound();

  const priorities = parseMulti(sp.priority).filter((p) => (TASK_PRIORITIES as readonly string[]).includes(p));
  const statuses = parseMulti(sp.status).filter((s) => (TASK_STATUSES as readonly string[]).includes(s));
  const tagFilters = parseMulti(sp.tag);
  const assigneeFilters = parseMulti(sp.assignee);
  const boardFilters = parseMulti(sp.board);
  const sprintFilters = parseMulti(sp.sprint);
  const sorts = parseSorts(sp.sort);
  const showArchived = sp.showArchived === "1";
  const requestedPage = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const [boards, sprints, tags, members] = await Promise.all([
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
      select: { name: true, color: true },
      orderBy: { name: "asc" },
    }),
    prisma.workspaceMember.findMany({
      where: { workspaceId },
      select: { user: { select: { id: true, name: true, email: true, image: true } } },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  const { tasks, total } = await searchWorkspaceTasksList(
    workspaceId,
    {
      q: sp.q,
      priorities,
      statuses,
      tagFilters,
      assigneeFilters,
      boardIds: boardFilters,
      sprintIds: sprintFilters,
      showArchived,
    },
    sorts,
    requestedPage,
    PAGE_SIZE,
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-center gap-2">
        <ListChecks size={16} className="text-accent" />
        <h1 className="font-mono text-lg font-semibold text-fg-primary">
          Tasks in <span className="text-accent">{membership.workspace.name}</span>
        </h1>
      </div>
      <p className="mt-1 text-[11px] text-fg-muted">
        {total} task{total !== 1 && "s"}
      </p>

      <div className="mt-6 space-y-4">
        <TaskSearchFilters
          boards={boards}
          sprints={sprints}
          tags={tags}
          assignees={members.map((m) => m.user)}
          current={{
            q: sp.q,
            priorities,
            statuses,
            tags: tagFilters,
            assignees: assigneeFilters,
            boards: boardFilters,
            sprints: sprintFilters,
            sorts,
            showArchived,
          }}
        />

        <TaskSearchList tasks={tasks} workspaceId={workspaceId} page={page} pageSize={PAGE_SIZE} total={total} />
      </div>
    </div>
  );
}
