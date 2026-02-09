"use client";

import { useGetTasksQuery } from "@/state/api";
import TableView from "@/components/TableView";
import { FilterState, SortState } from "@/lib/filterTypes";

type Props = {
  id: string;
  setIsModalNewTaskOpen: (isOpen: boolean) => void;
  filterState: FilterState;
  sortState?: SortState;
};

const BoardTableView = ({ id, setIsModalNewTaskOpen, filterState, sortState }: Props) => {
  const { data: tasks, error, isLoading } = useGetTasksQuery({ projectId: Number(id) });

  if (isLoading) return <div className="flex h-96 items-center justify-center text-gray-500">Loading...</div>;
  if (error) return <div className="flex h-96 items-center justify-center text-red-500">An error occurred while fetching tasks</div>;

  return (
    <TableView
      tasks={tasks ?? []}
      setIsModalNewTaskOpen={setIsModalNewTaskOpen}
      filterState={filterState}
      sortState={sortState}
      emptyMessage="No tasks in this board"
    />
  );
};

export default BoardTableView;
