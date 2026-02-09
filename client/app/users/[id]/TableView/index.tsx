"use client";

import { useGetTasksAssignedToUserQuery } from "@/state/api";
import TableView from "@/components/TableView";
import { FilterState, SortState } from "@/lib/filterTypes";

type Props = {
  userId: number;
  setIsModalNewTaskOpen: (isOpen: boolean) => void;
  filterState: FilterState;
  sortState?: SortState;
};

const UserTableView = ({ userId, filterState, sortState }: Props) => {
  const { data: tasks, error, isLoading } = useGetTasksAssignedToUserQuery(userId);

  if (isLoading) return <div className="flex h-96 items-center justify-center text-gray-500">Loading...</div>;
  if (error) return <div className="flex h-96 items-center justify-center text-red-500">An error occurred while fetching tasks</div>;

  return (
    <TableView
      tasks={tasks ?? []}
      filterState={filterState}
      sortState={sortState}
      showCreateButton={false}
      showAssigneeColumn={false}
      emptyMessage="No tasks assigned to this user"
    />
  );
};

export default UserTableView;
