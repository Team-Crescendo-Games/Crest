"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import {
  Status,
  useGetTasksAssignedToUserQuery,
  useGetPointsAnalyticsQuery,
  useGetBoardsQuery,
  useGetWorkspacesQuery,
} from "@/state/api";
import { useAuthUser } from "@/lib/useAuthUser";
import { useWorkspace } from "@/lib/useWorkspace";
import { ClipboardList } from "lucide-react";
import PointsGraph from "@/components/PointsGraph";
import ModalNewWorkspace from "@/components/workspaces/ModalNewWorkspace";
import { format, subMonths } from "date-fns";

type GroupBy = "week" | "month" | "year";

const DashboardPage = () => {
  const { activeWorkspaceId } = useWorkspace();

  const [groupBy, setGroupBy] = useState<GroupBy>("week");
  const [startDate, setStartDate] = useState(() =>
    format(subMonths(new Date(), 3), "yyyy-MM-dd"),
  );
  const [endDate, setEndDate] = useState(() =>
    format(new Date(), "yyyy-MM-dd"),
  );

  const {
    data: authData,
    isLoading: authLoading,
    isFetching: authFetching,
  } = useAuthUser();
  const userId = authData?.userDetails?.userId;

  // Fetch Workspaces to check for empty state
  const { data: workspaces, isLoading: workspacesLoading } =
    useGetWorkspacesQuery(userId!, { skip: !userId });

  const { data: boards = [], isLoading: boardsLoading } = useGetBoardsQuery(
    activeWorkspaceId!,
    {
      skip: !activeWorkspaceId,
    },
  );

  const {
    data: assignedTasks,
    isLoading: tasksLoading,
    isFetching: tasksFetching,
    refetch: refetchTasks,
  } = useGetTasksAssignedToUserQuery(userId!, { skip: !userId });

  const {
    data: pointsData,
    isLoading: pointsLoading,
    isFetching: pointsFetching,
    refetch: refetchPoints,
  } = useGetPointsAnalyticsQuery(
    {
      userId: userId!,
      workspaceId: activeWorkspaceId!,
      groupBy,
      startDate,
      endDate,
    },
    { skip: !userId || !activeWorkspaceId },
  );

  useEffect(() => {
    if (userId && activeWorkspaceId) {
      refetchTasks();
      refetchPoints();
    }
  }, [userId, activeWorkspaceId, refetchTasks, refetchPoints]);

  const activeBoardIds = new Set(boards.map((b) => b.id));
  const workspaceTasks =
    assignedTasks?.filter(
      (task) => task.boardId && activeBoardIds.has(task.boardId),
    ) ?? [];
  const openTasksCount = workspaceTasks.filter(
    (task) => task.status !== Status.Done,
  ).length;

  const isAuthOrWorkspaceLoading = authLoading || workspacesLoading;

  const hasNoWorkspaces = !isAuthOrWorkspaceLoading && workspaces?.length === 0;

  const isDataLoading =
    !hasNoWorkspaces &&
    (authFetching ||
      tasksLoading ||
      tasksFetching ||
      boardsLoading ||
      pointsLoading ||
      pointsFetching ||
      !activeWorkspaceId);

  if (isAuthOrWorkspaceLoading || isDataLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-gray-500 dark:text-neutral-400">
          Loading Dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="h-full p-8">
      <ModalNewWorkspace isOpen={hasNoWorkspaces} onClose={() => {}} />

      {!hasNoWorkspaces && (
        <>
          <Header name="Dashboard" />

          {/* Stats Card */}
          <div className="mb-8">
            <div className="rounded-lg bg-white p-6 shadow dark:bg-dark-secondary">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/30">
                  <ClipboardList className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {openTasksCount}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-neutral-400">
                    Open Tasks in Workspace
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Points Graph */}
          <PointsGraph
            data={pointsData ?? []}
            groupBy={groupBy}
            startDate={startDate}
            endDate={endDate}
            onGroupByChange={setGroupBy}
            onDateRangeChange={(start, end) => {
              setStartDate(start);
              setEndDate(end);
            }}
          />
        </>
      )}
    </div>
  );
};

export default DashboardPage;
