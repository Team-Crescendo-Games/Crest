"use client";

import { useState } from "react";
import { useAppSelector } from "@/app/redux";
import { dataGridClassNames, dataGridSxStyles } from "@/lib/utils";
import { useGetTasksAssignedToUserQuery } from "@/state/api";
import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import TaskDetailModal from "@/components/TaskDetailModal";
import { applyFilters } from "@/lib/filterUtils";
import { FilterState } from "@/lib/filterTypes";
import { PRIORITY_BADGE_STYLES } from "@/lib/priorityColors";
import { STATUS_BADGE_STYLES } from "@/lib/statusColors";

type Props = {
  userId: number;
  setIsModalNewTaskOpen: (isOpen: boolean) => void;
  filterState: FilterState;
};

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const statusColors = STATUS_BADGE_STYLES;
const priorityColors = PRIORITY_BADGE_STYLES;

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
];

const UserTableView = ({ userId, filterState }: Props) => {
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);
  const { data: tasks, error, isLoading } = useGetTasksAssignedToUserQuery(userId);

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

  if (isLoading) return <div className="flex h-96 items-center justify-center text-gray-500">Loading...</div>;
  if (error || !tasks) return <div className="flex h-96 items-center justify-center text-red-500">An error occurred while fetching tasks</div>;

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

export default UserTableView;
