"use client";

import { useGetTasksAssignedToUserQuery, useGetBoardsQuery } from "@/state/api"; // REPLACED
import TableView from "@/components/TableView";
import { FilterState, SortState } from "@/lib/filterTypes";
import { useWorkspace } from "@/lib/useWorkspace";

type Props = {
  userId: number;
  setIsModalNewTaskOpen: (isOpen: boolean) => void;
  filterState: FilterState;
  sortState?: SortState;
};

const UserTableView = ({
  userId,
  setIsModalNewTaskOpen,
  filterState,
  sortState,
}: Props) => {
  const { activeWorkspaceId } = useWorkspace();

  const {
    data: tasks,
    error,
    isLoading,
  } = useGetTasksAssignedToUserQuery(userId);
  const { data: boards = [] } = useGetBoardsQuery(activeWorkspaceId!, {
    skip: !activeWorkspaceId,
  });

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
  const activeBoardIds = new Set(
    boards.filter((b) => b.isActive).map((b) => b.id),
  );
  const activeTasks = (tasks ?? []).filter(
    (task) => !task.boardId || activeBoardIds.has(task.boardId),
  );

  return (
    <TableView
      tasks={activeTasks}
      setIsModalNewTaskOpen={setIsModalNewTaskOpen}
      filterState={filterState}
      sortState={sortState}
      showCreateButton={false}
      showAssigneeColumn={false}
      emptyMessage="No tasks assigned to this user"
    />
  );
};

export default UserTableView;
