"use client";

import { useGetTasksQuery } from "@/state/api";
import BoardView from "@/components/BoardView";
import { FilterState } from "@/lib/filterTypes";

type BoardProps = {
  id: string;
  setIsModalNewTaskOpen: (isOpen: boolean) => void;
  filterState: FilterState;
};

const BoardViewWrapper = ({ id, setIsModalNewTaskOpen, filterState }: BoardProps) => {
  const { data: tasks, isLoading, error } = useGetTasksQuery({ projectId: Number(id) });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>An error occurred while fetching tasks</div>;

  return (
    <BoardView
      tasks={tasks ?? []}
      setIsModalNewTaskOpen={setIsModalNewTaskOpen}
      filterState={filterState}
    />
  );
};

export default BoardViewWrapper;
