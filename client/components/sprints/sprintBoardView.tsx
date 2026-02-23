"use client";

import { Task as TaskType } from "@/state/api";
import BoardView from "@/components/boards/boardView";
import { FilterState, SortState } from "@/lib/filterTypes";

type Props = {
  sprintId: number;
  tasks: TaskType[];
  setIsModalNewTaskOpen: (isOpen: boolean) => void;
  filterState: FilterState;
  sortState: SortState;
  showMyTasks?: boolean;
  taskSelectionMap?: Map<number, string>;
  onTaskSelect?: (taskId: number | null) => void;
  onTaskUpdate?: (taskId: number) => void;
};

/**
 * Sprint BoardView wrapper component
 * Uses the shared BoardView component with sprint tasks
 */
const SprintBoardView = ({
  sprintId,
  tasks,
  setIsModalNewTaskOpen,
  filterState,
  sortState,
  showMyTasks = false,
  taskSelectionMap,
  onTaskSelect,
  onTaskUpdate,
}: Props) => {
  return (
    <BoardView
      boardId={`sprint-${sprintId}`}
      tasks={tasks}
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

export default SprintBoardView;
