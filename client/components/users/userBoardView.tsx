"use client";

import { useGetTasksAssignedToUserQuery, useGetBoardsQuery } from "@/state/api";
import BoardView from "@/components/boards/boardView";
import { FilterState, SortState } from "@/lib/filterTypes";
import { useWorkspace } from "@/lib/useWorkspace";

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
  const { activeWorkspaceId } = useWorkspace();

  const {
    data: tasks,
    isLoading,
    error,
  } = useGetTasksAssignedToUserQuery(userId);

  const { data: boards = [] } = useGetBoardsQuery(activeWorkspaceId!, {
    skip: !activeWorkspaceId,
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>An error occurred while fetching tasks</div>;

  // Filter out tasks from archived boards
  const activeBoardIds = new Set(
    boards.filter((b) => b.isActive).map((b) => b.id),
  );
  const activeTasks = (tasks ?? []).filter(
    (task) => !task.boardId || activeBoardIds.has(task.boardId),
  );

  return (
    <BoardView
      boardId="user-view" // Added generic ID for the BoardView prop requirement
      tasks={activeTasks}
      setIsModalNewTaskOpen={setIsModalNewTaskOpen}
      filterState={filterState}
      sortState={sortState}
    />
  );
};

export default UserBoardView;
