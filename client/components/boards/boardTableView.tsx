"use client";

import { Task as TaskType } from "@/state/api";
import TableView from "@/components/TableView";
import { FilterState, SortState } from "@/lib/filterTypes";

type Props = {
  boardId: string;
  tasks: TaskType[];
  setIsModalNewTaskOpen: (isOpen: boolean) => void;
  filterState: FilterState;
  sortState?: SortState;
};

export default function BoardTableView({
  tasks,
  setIsModalNewTaskOpen,
  filterState,
  sortState,
}: Props) {
  return (
    <TableView
      tasks={tasks}
      setIsModalNewTaskOpen={setIsModalNewTaskOpen}
      filterState={filterState}
      sortState={sortState}
      emptyMessage="No tasks in this board"
    />
  );
}
