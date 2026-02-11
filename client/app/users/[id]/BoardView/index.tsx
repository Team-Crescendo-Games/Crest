"use client";

import { useGetTasksAssignedToUserQuery, useGetProjectsQuery } from "@/state/api";
import BoardView from "@/components/BoardView";
import { FilterState, SortState } from "@/lib/filterTypes";

type Props = {
  userId: number;
  setIsModalNewTaskOpen: (isOpen: boolean) => void;
  filterState: FilterState;
  sortState: SortState;
};

const UserBoardView = ({
  userId,
  setIsModalNewTaskOpen,
  filterState,
  sortState,
}: Props) => {
  const {
    data: tasks,
    isLoading,
    error,
  } = useGetTasksAssignedToUserQuery(userId);
  const { data: projects = [] } = useGetProjectsQuery();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>An error occurred while fetching tasks</div>;

  // Filter out tasks from archived boards
  const activeProjectIds = new Set(projects.filter((p) => p.isActive).map((p) => p.id));
  const activeTasks = (tasks ?? []).filter(
    (task) => !task.projectId || activeProjectIds.has(task.projectId),
  );

  return (
    <BoardView
      tasks={activeTasks}
      setIsModalNewTaskOpen={setIsModalNewTaskOpen}
      filterState={filterState}
      sortState={sortState}
    />
  );
};

export default UserBoardView;
