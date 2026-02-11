"use client";

import { useGetTasksAssignedToUserQuery, useGetProjectsQuery } from "@/state/api";
import TableView from "@/components/TableView";
import { FilterState, SortState } from "@/lib/filterTypes";

type Props = {
  userId: number;
  setIsModalNewTaskOpen: (isOpen: boolean) => void;
  filterState: FilterState;
  sortState?: SortState;
};

const UserTableView = ({ userId, filterState, sortState }: Props) => {
  const {
    data: tasks,
    error,
    isLoading,
  } = useGetTasksAssignedToUserQuery(userId);
  const { data: projects = [] } = useGetProjectsQuery();

  if (isLoading)
    return (
      <div className="flex h-96 items-center justify-center text-gray-500">
        Loading...
      </div>
    );
  if (error)
    return (
      <div className="flex h-96 items-center justify-center text-red-500">
        An error occurred while fetching tasks
      </div>
    );

  // Filter out tasks from archived boards
  const activeProjectIds = new Set(projects.filter((p) => p.isActive).map((p) => p.id));
  const activeTasks = (tasks ?? []).filter(
    (task) => !task.projectId || activeProjectIds.has(task.projectId),
  );

  return (
    <TableView
      tasks={activeTasks}
      filterState={filterState}
      sortState={sortState}
      showCreateButton={false}
      showAssigneeColumn={false}
      emptyMessage="No tasks assigned to this user"
    />
  );
};

export default UserTableView;
