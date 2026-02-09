"use client";

import { Task } from "@/state/api";
import TableView from "@/components/TableView";
import { FilterState, SortState } from "@/lib/filterTypes";

type Props = {
  sprintId: number;
  tasks: Task[];
  setIsModalNewTaskOpen: (isOpen: boolean) => void;
  filterState: FilterState;
  sortState?: SortState;
};

const SprintTableView = ({ tasks, setIsModalNewTaskOpen, filterState, sortState }: Props) => {
  return (
    <TableView
      tasks={tasks}
      setIsModalNewTaskOpen={setIsModalNewTaskOpen}
      filterState={filterState}
      sortState={sortState}
      emptyMessage="No tasks in this sprint"
    />
  );
};

export default SprintTableView;
