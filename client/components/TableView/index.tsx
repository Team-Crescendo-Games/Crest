"use client";

import { useState } from "react";
import { Plus, ChevronUp, ChevronDown } from "lucide-react";
import { Task } from "@/state/api";
import TaskDetailModal from "@/components/tasks/taskDetailModal";
import UserIcon from "@/components/UserIcon";
import {
  applyFilters,
  applySorting,
  priorityOrder,
  statusOrder,
} from "@/lib/filterUtils";
import { FilterState, SortState, initialSortState } from "@/lib/filterTypes";
import { PRIORITY_BADGE_STYLES } from "@/lib/priorityColors";
import { STATUS_BADGE_STYLES } from "@/lib/statusColors";

type Props = {
  tasks: Task[];
  setIsModalNewTaskOpen?: (isOpen: boolean) => void;
  filterState: FilterState;
  sortState?: SortState;
  showCreateButton?: boolean;
  showAssigneeColumn?: boolean;
  emptyMessage?: string;
};

type SortField =
  | "title"
  | "status"
  | "priority"
  | "points"
  | "startDate"
  | "dueDate";
type SortDirection = "asc" | "desc";

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
};

const StatusBadge = ({ value }: { value: string }) => {
  const colors =
    STATUS_BADGE_STYLES[value] || STATUS_BADGE_STYLES["Input Queue"];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text} ${colors.darkBg} ${colors.darkText}`}
    >
      {value}
    </span>
  );
};

const PriorityBadge = ({ value }: { value: string }) => {
  const colors =
    PRIORITY_BADGE_STYLES[value] || PRIORITY_BADGE_STYLES["Medium"];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text} ${colors.darkBg} ${colors.darkText}`}
    >
      {value}
    </span>
  );
};

const SortIcon = ({
  field,
  currentField,
  direction,
}: {
  field: SortField;
  currentField: SortField | null;
  direction: SortDirection;
}) => {
  if (currentField !== field) {
    return <ChevronUp size={14} className="text-gray-300 dark:text-gray-600" />;
  }
  return direction === "asc" ? (
    <ChevronUp size={14} className="text-gray-600 dark:text-gray-300" />
  ) : (
    <ChevronDown size={14} className="text-gray-600 dark:text-gray-300" />
  );
};

const TableView = ({
  tasks,
  setIsModalNewTaskOpen,
  filterState,
  sortState = initialSortState,
  showCreateButton = true,
  showAssigneeColumn = true,
  emptyMessage = "No tasks found",
}: Props) => {
  const [localSortField, setLocalSortField] = useState<SortField | null>(null);
  const [localSortDirection, setLocalSortDirection] =
    useState<SortDirection>("asc");
  const [isTaskDetailModalOpen, setIsTaskDetailModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  const filteredTasks = applyFilters(tasks, filterState);
  const sortedTasks = applySorting(filteredTasks, sortState);

  // Apply local sorting
  const displayTasks = localSortField
    ? [...sortedTasks].sort((a, b) => {
        let aVal: string | number | null = a[localSortField] as
          | string
          | number
          | null;
        let bVal: string | number | null = b[localSortField] as
          | string
          | number
          | null;

        if (localSortField === "startDate" || localSortField === "dueDate") {
          aVal = aVal ? new Date(aVal).getTime() : 0;
          bVal = bVal ? new Date(bVal).getTime() : 0;
        }

        if (localSortField === "priority") {
          aVal = aVal
            ? (priorityOrder[aVal as keyof typeof priorityOrder] ?? 99)
            : 99;
          bVal = bVal
            ? (priorityOrder[bVal as keyof typeof priorityOrder] ?? 99)
            : 99;
          return localSortDirection === "asc" ? aVal - bVal : bVal - aVal;
        }

        if (localSortField === "status") {
          aVal = aVal ? (statusOrder[aVal] ?? 99) : 99;
          bVal = bVal ? (statusOrder[bVal] ?? 99) : 99;
          return localSortDirection === "asc" ? aVal - bVal : bVal - aVal;
        }

        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        if (typeof aVal === "string") {
          const bStr = String(bVal);
          return localSortDirection === "asc"
            ? aVal.localeCompare(bStr)
            : bStr.localeCompare(aVal);
        }

        return localSortDirection === "asc"
          ? Number(aVal) - Number(bVal)
          : Number(bVal) - Number(aVal);
      })
    : sortedTasks;

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || null;

  const handleSort = (field: SortField) => {
    if (localSortField === field) {
      setLocalSortDirection(localSortDirection === "asc" ? "desc" : "asc");
    } else {
      setLocalSortField(field);
      setLocalSortDirection("asc");
    }
  };

  const handleRowClick = (taskId: number) => {
    setSelectedTaskId(taskId);
    setIsTaskDetailModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsTaskDetailModalOpen(false);
    setSelectedTaskId(null);
  };

  const headerClass =
    "px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-dark-tertiary transition-colors";

  return (
    <div className="w-full px-4 pb-8 pt-4 xl:px-6">
      {showCreateButton && setIsModalNewTaskOpen && (
        <div className="mb-4">
          <button
            onClick={() => setIsModalNewTaskOpen(true)}
            className="flex cursor-pointer items-center gap-2 rounded-md border-2 border-dashed border-gray-300 bg-white/50 px-4 py-2 text-gray-500 transition-colors hover:border-gray-400 hover:bg-white hover:text-gray-700 dark:border-stroke-dark dark:bg-dark-secondary/50 dark:text-neutral-500 dark:hover:border-neutral-500 dark:hover:bg-dark-secondary dark:hover:text-neutral-300"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200/70 dark:bg-dark-tertiary/70">
              <Plus size={14} />
            </span>
            <span className="text-sm font-medium">Create Task</span>
          </button>
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="flex h-80 items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">{emptyMessage}</p>
        </div>
      ) : (
        <div className="rounded border border-gray-200 bg-white shadow-sm dark:border-stroke-dark dark:bg-dark-secondary">
          <div className="max-h-[calc(100vh-280px)] overflow-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-stroke-dark">
              <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-dark-tertiary">
                <tr>
                  <th
                    className={`${headerClass} min-w-[200px] max-w-[400px]`}
                    onClick={() => handleSort("title")}
                  >
                    <div className="flex items-center gap-1">
                      Title
                      <SortIcon
                        field="title"
                        currentField={localSortField}
                        direction={localSortDirection}
                      />
                    </div>
                  </th>
                  <th
                    className={headerClass}
                    onClick={() => handleSort("status")}
                  >
                    <div className="flex items-center gap-1">
                      Status
                      <SortIcon
                        field="status"
                        currentField={localSortField}
                        direction={localSortDirection}
                      />
                    </div>
                  </th>
                  <th
                    className={headerClass}
                    onClick={() => handleSort("priority")}
                  >
                    <div className="flex items-center gap-1">
                      Priority
                      <SortIcon
                        field="priority"
                        currentField={localSortField}
                        direction={localSortDirection}
                      />
                    </div>
                  </th>
                  <th
                    className={`${headerClass} text-center`}
                    onClick={() => handleSort("points")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Pts
                      <SortIcon
                        field="points"
                        currentField={localSortField}
                        direction={localSortDirection}
                      />
                    </div>
                  </th>
                  <th
                    className={headerClass}
                    onClick={() => handleSort("startDate")}
                  >
                    <div className="flex items-center gap-1">
                      Start
                      <SortIcon
                        field="startDate"
                        currentField={localSortField}
                        direction={localSortDirection}
                      />
                    </div>
                  </th>
                  <th
                    className={headerClass}
                    onClick={() => handleSort("dueDate")}
                  >
                    <div className="flex items-center gap-1">
                      Due
                      <SortIcon
                        field="dueDate"
                        currentField={localSortField}
                        direction={localSortDirection}
                      />
                    </div>
                  </th>
                  {showAssigneeColumn && (
                    <th className={`${headerClass} text-center`}>Assignee</th>
                  )}
                  <th className={`${headerClass} text-center`}>Author</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-stroke-dark">
                {displayTasks.map((task) => (
                  <tr
                    key={task.id}
                    onClick={() => handleRowClick(task.id)}
                    className="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-dark-tertiary"
                  >
                    <td className="max-w-[400px] px-3 py-3">
                      <span className="block truncate font-medium text-gray-900 dark:text-white">
                        {task.title}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge value={task.status || "To Do"} />
                    </td>
                    <td className="px-3 py-3">
                      {task.priority ? (
                        <PriorityBadge value={task.priority} />
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {task.points !== null && task.points !== undefined ? (
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                          {task.points}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(task.startDate)}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(task.dueDate)}
                    </td>
                    {showAssigneeColumn && (
                      <td className="px-3 py-3">
                        <div className="flex justify-center">
                          {task.taskAssignments &&
                          task.taskAssignments.length > 0 ? (
                            <div className="flex -space-x-1">
                              {task.taskAssignments.slice(0, 3).map((ta) => (
                                <UserIcon
                                  key={ta.userId}
                                  userId={ta.user.userId}
                                  username={ta.user.username}
                                  fullName={ta.user.fullName}
                                  profilePictureExt={ta.user.profilePictureExt}
                                  size={28}
                                  tooltipLabel="Assignee"
                                  className="ring-2 ring-white dark:ring-dark-secondary"
                                />
                              ))}
                              {task.taskAssignments.length > 3 && (
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600 ring-2 ring-white dark:bg-dark-tertiary dark:text-gray-300 dark:ring-dark-secondary">
                                  +{task.taskAssignments.length - 3}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </div>
                      </td>
                    )}
                    <td className="px-3 py-3">
                      <div className="flex justify-center">
                        {task.author ? (
                          <UserIcon
                            userId={task.author.userId}
                            username={task.author.username}
                            fullName={task.author.fullName}
                            profilePictureExt={task.author.profilePictureExt}
                            size={28}
                            tooltipLabel="Author"
                          />
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <TaskDetailModal
        isOpen={isTaskDetailModalOpen}
        onClose={handleCloseModal}
        task={selectedTask}
        tasks={tasks}
      />
    </div>
  );
};

export default TableView;
