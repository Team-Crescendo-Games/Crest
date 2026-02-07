"use client";

import { useState } from "react";
import { useAppSelector } from "@/app/redux";
import { dataGridClassNames, dataGridSxStyles } from "@/lib/utils";
import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import TaskDetailModal from "@/components/TaskDetailModal";
import { applyFilters } from "@/lib/filterUtils";
import { FilterState } from "@/lib/filterTypes";
import { Task } from "@/state/api";

type Props = {
  sprintId: number;
  tasks: Task[];
  setIsModalNewTaskOpen: (isOpen: boolean) => void;
  filterState: FilterState;
};

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const statusColors: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
  "Input Queue": { bg: "bg-blue-100", text: "text-blue-700", darkBg: "dark:bg-blue-900/30", darkText: "dark:text-blue-300" },
  "Work In Progress": { bg: "bg-amber-100", text: "text-amber-700", darkBg: "dark:bg-amber-900/30", darkText: "dark:text-amber-300" },
  "Review": { bg: "bg-purple-100", text: "text-purple-700", darkBg: "dark:bg-purple-900/30", darkText: "dark:text-purple-300" },
  "Done": { bg: "bg-green-100", text: "text-green-700", darkBg: "dark:bg-green-900/30", darkText: "dark:text-green-300" },
};

const priorityColors: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
  "Urgent": { bg: "bg-red-100", text: "text-red-700", darkBg: "dark:bg-red-900/30", darkText: "dark:text-red-300" },
  "High": { bg: "bg-orange-100", text: "text-orange-700", darkBg: "dark:bg-orange-900/30", darkText: "dark:text-orange-300" },
  "Medium": { bg: "bg-yellow-100", text: "text-yellow-700", darkBg: "dark:bg-yellow-900/30", darkText: "dark:text-yellow-300" },
  "Low": { bg: "bg-sky-100", text: "text-sky-700", darkBg: "dark:bg-sky-900/30", darkText: "dark:text-sky-300" },
  "Backlog": { bg: "bg-gray-100", text: "text-gray-600", darkBg: "dark:bg-gray-700/30", darkText: "dark:text-gray-400" },
};

const StatusCell = ({ value }: { value: string }) => {
  const colors = statusColors[value] || statusColors["Input Queue"];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors.bg} ${colors.text} ${colors.darkBg} ${colors.darkText}`}>
      {value}
    </span>
  );
};

const PriorityCell = ({ value }: { value: string }) => {
  const colors = priorityColors[value] || priorityColors["Medium"];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors.bg} ${colors.text} ${colors.darkBg} ${colors.darkText}`}>
      {value}
    </span>
  );
};

const columns: GridColDef[] = [
  {
    field: "title",
    headerName: "Title",
    flex: 1,
    minWidth: 200,
    renderCell: (params: GridRenderCellParams) => (
      <span className="font-medium text-gray-900 dark:text-white">{params.value}</span>
    ),
  },
  {
    field: "status",
    headerName: "Status",
    width: 150,
    renderCell: (params: GridRenderCellParams) => <StatusCell value={params.value} />,
  },
  {
    field: "priority",
    headerName: "Priority",
    width: 110,
    renderCell: (params: GridRenderCellParams) => <PriorityCell value={params.value} />,
  },
  {
    field: "points",
    headerName: "Points",
    width: 80,
    align: "center",
    headerAlign: "center",
    renderCell: (params: GridRenderCellParams) => (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
        {params.value ?? "—"}
      </span>
    ),
  },
  {
    field: "startDate",
    headerName: "Start",
    width: 100,
    renderCell: (params: GridRenderCellParams) => (
      <span className="text-gray-500 dark:text-gray-400">{formatDate(params.value)}</span>
    ),
  },
  {
    field: "dueDate",
    headerName: "Due",
    width: 100,
    renderCell: (params: GridRenderCellParams) => (
      <span className="text-gray-500 dark:text-gray-400">{formatDate(params.value)}</span>
    ),
  },
  {
    field: "author",
    headerName: "Author",
    width: 130,
    renderCell: (params: GridRenderCellParams) => (
      <span className="text-gray-600 dark:text-gray-300">{params.value?.username || "—"}</span>
    ),
  },
  {
    field: "assignee",
    headerName: "Assignee",
    width: 130,
    renderCell: (params: GridRenderCellParams) => (
      <span className="text-gray-600 dark:text-gray-300">{params.value?.username || "—"}</span>
    ),
  },
];

const TableView = ({ tasks, filterState }: Props) => {
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);

  const filteredTasks = applyFilters(tasks ?? [], filterState);

  const [isTaskDetailModalOpen, setIsTaskDetailModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  const selectedTask = tasks?.find((t) => t.id === selectedTaskId) || null;

  const handleRowClick = (params: { id: number | string }) => {
    setSelectedTaskId(Number(params.id));
    setIsTaskDetailModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsTaskDetailModalOpen(false);
    setSelectedTaskId(null);
  };

  if (!tasks || tasks.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center px-4 pb-8 xl:px-6">
        <p className="text-gray-500 dark:text-gray-400">No tasks in this sprint</p>
      </div>
    );
  }

  return (
    <div className="h-[540px] w-full px-4 pb-8 xl:px-6">
      <DataGrid
        rows={filteredTasks}
        columns={columns}
        className={dataGridClassNames}
        sx={dataGridSxStyles(isDarkMode)}
        rowHeight={48}
        onRowClick={handleRowClick}
        disableRowSelectionOnClick
        initialState={{
          pagination: { paginationModel: { pageSize: 10 } },
        }}
        pageSizeOptions={[10, 25, 50]}
      />
      <TaskDetailModal
        isOpen={isTaskDetailModalOpen}
        onClose={handleCloseModal}
        task={selectedTask}
        tasks={tasks || []}
      />
    </div>
  );
};

export default TableView;
