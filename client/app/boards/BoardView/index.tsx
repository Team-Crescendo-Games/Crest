"use client";

import { useGetTasksQuery } from "@/state/api";
import BoardView from "@/components/BoardView";
import { FilterState, SortState } from "@/lib/filterTypes";

type BoardProps = {
  id: string;
  setIsModalNewTaskOpen: (isOpen: boolean) => void;
  filterState: FilterState;
  sortState: SortState;
  showMyTasks?: boolean;
  taskSelectionMap?: Map<number, string>;
  onTaskSelect?: (taskId: number | null) => void;
  onTaskUpdate?: (taskId: number) => void;
};

const BoardViewWrapper = ({
  id,
  setIsModalNewTaskOpen,
  filterState,
  sortState,
  showMyTasks = false,
  taskSelectionMap,
  onTaskSelect,
  onTaskUpdate,
}: BoardProps) => {
  const {
    data: tasks,
    isLoading,
    error,
  } = useGetTasksQuery({ projectId: Number(id) });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>An error occurred while fetching tasks</div>;

  return (
    <BoardView
      tasks={tasks ?? []}
      setIsModalNewTaskOpen={setIsModalNewTaskOpen}
      filterState={filterState}
      sortState={sortState}
      showMyTasks={showMyTasks}
      taskSelectionMap={taskSelectionMap}
      onTaskSelect={onTaskSelect}
      onTaskUpdate={onTaskUpdate}
    />
  );
};

export default BoardViewWrapper;
