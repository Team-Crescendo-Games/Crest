"use client";

import { useGetTasksAssignedToUserQuery } from "@/state/api";
import BoardView from "@/components/BoardView";
import { FilterState, SortState } from "@/lib/filterTypes";

type Props = {
  userId: number;
  setIsModalNewTaskOpen: (isOpen: boolean) => void;
  filterState: FilterState;
  sortState: SortState;
};

const UserBoardView = ({ userId, setIsModalNewTaskOpen, filterState, sortState }: Props) => {
  const { data: tasks, isLoading, error } = useGetTasksAssignedToUserQuery(userId);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>An error occurred while fetching tasks</div>;

  return (
    <BoardView
      tasks={tasks ?? []}
      setIsModalNewTaskOpen={setIsModalNewTaskOpen}
      filterState={filterState}
      sortState={sortState}
    />
  );
};

export default UserBoardView;
