"use client";

import { useState } from "react";
import { useDrag, useDrop } from "react-dnd";
import { Task as TaskType, useUpdateTaskStatusMutation } from "@/state/api";
import { useAuthUser } from "@/lib/useAuthUser";
import { ClipboardList, Diamond, Plus } from "lucide-react";
import type { DropTargetMonitor, DragSourceMonitor } from "react-dnd";
import TaskDetailModal from "@/components/tasks/taskDetailModal";
import TaskCard from "@/components/tasks/taskCard";
import { applyFilters, applySorting } from "@/lib/filterUtils";
import { FilterState, SortState, initialSortState } from "@/lib/filterTypes";
import { STATUS_COLORS_BY_NAME } from "@/lib/statusColors";
import { DND_ITEM_TYPES, DraggedTask } from "@/lib/dndTypes";

type BoardViewProps = {
  boardId: string;
  tasks: TaskType[];
  setIsModalNewTaskOpen: (isOpen: boolean) => void;
  filterState: FilterState;
  sortState?: SortState;
  showMyTasks?: boolean;
  taskSelectionMap?: Map<number, string>;
  onTaskSelect?: (taskId: number | null) => void;
  onTaskUpdate?: (taskId: number) => void;
};

const taskStatus = ["Input Queue", "Work In Progress", "Review", "Done"];

export default function BoardView({
  tasks,
  setIsModalNewTaskOpen,
  filterState,
  sortState = initialSortState,
  showMyTasks = false,
  taskSelectionMap,
  onTaskSelect,
  onTaskUpdate,
}: BoardViewProps) {
  const [updateTaskStatus] = useUpdateTaskStatusMutation();
  const { data: authData } = useAuthUser();

  const currentUserId = authData?.userDetails?.userId;

  const filteredTasks = applyFilters(tasks, filterState);
  const sortedTasks = applySorting(filteredTasks, sortState);

  const [isTaskDetailModalOpen, setIsTaskDetailModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || null;

  const handleTaskClick = (task: TaskType) => {
    setSelectedTaskId(task.id);
    setIsTaskDetailModalOpen(true);
    onTaskSelect?.(task.id);
  };

  const handleCloseModal = () => {
    setIsTaskDetailModalOpen(false);
    setSelectedTaskId(null);
    onTaskSelect?.(null);
  };

  const moveTask = async (taskId: number, toStatus: string) => {
    try {
      const userId = authData?.userDetails?.userId;
      await updateTaskStatus({ taskId, status: toStatus, userId }).unwrap();
      onTaskUpdate?.(taskId);
    } catch (error) {
      console.error("Failed to update task status:", error);
    }
  };

  return (
    <>
      <div className="grid h-full grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-4">
        {taskStatus.map((status) => (
          <TaskColumn
            key={status}
            status={status}
            tasks={sortedTasks}
            moveTask={moveTask}
            setIsModalNewTaskOpen={setIsModalNewTaskOpen}
            onTaskClick={handleTaskClick}
            showMyTasks={showMyTasks}
            currentUserId={currentUserId}
            taskSelectionMap={taskSelectionMap}
          />
        ))}
      </div>
      <TaskDetailModal
        isOpen={isTaskDetailModalOpen}
        onClose={handleCloseModal}
        task={selectedTask}
        tasks={tasks}
      />
    </>
  );
}

type TaskColumnProps = {
  status: string;
  tasks: TaskType[];
  moveTask: (taskId: number, toStatus: string) => void;
  setIsModalNewTaskOpen: (isOpen: boolean) => void;
  onTaskClick: (task: TaskType) => void;
  showMyTasks: boolean;
  currentUserId?: number;
  taskSelectionMap?: Map<number, string>;
};

const TaskColumn = ({
  status,
  tasks,
  moveTask,
  setIsModalNewTaskOpen,
  onTaskClick,
  showMyTasks,
  currentUserId,
  taskSelectionMap,
}: TaskColumnProps) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: DND_ITEM_TYPES.TASK,
    drop: (item: DraggedTask) => moveTask(item.id, status),
    collect: (monitor: DropTargetMonitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  const statusTasks = tasks.filter((task) => task.status === status);
  const tasksCount = statusTasks.length;
  const totalPoints = statusTasks.reduce(
    (sum, task) => sum + (task.points || 0),
    0,
  );

  return (
    <div
      ref={(instance) => {
        drop(instance);
      }}
      className={`flex min-h-0 flex-col rounded-lg border border-gray-200/50 bg-gray-100/80 px-3 py-4 shadow-sm backdrop-blur-sm transition-all duration-200 dark:border-stroke-dark/50 dark:bg-dark-secondary/80 xl:px-3 ${
        isOver
          ? "scale-[1.02] border-gray-300 bg-gray-200 shadow-md dark:border-stroke-dark dark:bg-dark-tertiary"
          : ""
      } `}
    >
      <div className="mb-4 flex w-full shrink-0 flex-col">
        <h3 className="flex items-center text-base font-semibold text-gray-800 dark:text-white">
          <span
            className="mr-2 h-3 w-3 rounded-full shadow-sm"
            style={{ backgroundColor: STATUS_COLORS_BY_NAME[status] }}
          />
          {status}{" "}
          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-center text-xs font-medium leading-none text-gray-600 dark:bg-dark-tertiary dark:text-gray-300">
            <ClipboardList className="h-3 w-3" /> {tasksCount} ·{" "}
            <Diamond className="h-2.5 w-2.5" fill="currentColor" />{" "}
            {totalPoints}
          </span>
        </h3>
        <div className="bg-linear-to-r mt-3 h-px from-gray-200 via-gray-300 to-gray-200 dark:from-stroke-dark dark:via-gray-600 dark:to-stroke-dark" />
      </div>

      <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1 py-1">
        {status === "Input Queue" && (
          <button
            onClick={() => setIsModalNewTaskOpen(true)}
            className="mb-2 flex w-full cursor-pointer items-center gap-2 rounded-md border-2 border-dashed border-gray-300 bg-white/50 p-3 text-gray-500 transition-colors hover:border-gray-400 hover:bg-white hover:text-gray-700 dark:border-stroke-dark dark:bg-dark-secondary/50 dark:text-neutral-500 dark:hover:border-neutral-500 dark:hover:bg-dark-secondary dark:hover:text-neutral-300"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200/70 dark:bg-dark-tertiary/70">
              <Plus size={14} />
            </span>
            <span className="text-sm font-medium">Create Task</span>
          </button>
        )}

        {statusTasks.map((task) => (
          <DraggableTask
            key={task.id}
            task={task}
            onClick={onTaskClick}
            highlighted={
              showMyTasks &&
              !!currentUserId &&
              task.taskAssignments?.some((ta) => ta.userId === currentUserId)
            }
            collaboratorBorderColor={taskSelectionMap?.get(task.id)}
          />
        ))}
      </div>
    </div>
  );
};

type DraggableTaskProps = {
  task: TaskType;
  onClick?: (task: TaskType) => void;
  highlighted?: boolean;
  collaboratorBorderColor?: string;
};

function DraggableTask({
  task,
  onClick,
  highlighted,
  collaboratorBorderColor,
}: DraggableTaskProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: DND_ITEM_TYPES.TASK,
    item: { id: task.id, boardId: task.boardId } as DraggedTask,
    collect: (monitor: DragSourceMonitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const handleClick = () => {
    if (!isDragging && onClick) {
      onClick(task);
    }
  };

  return (
    <div
      ref={(instance) => {
        drag(instance);
      }}
      className={`mb-2 ${isDragging ? "opacity-50" : "opacity-100"}`}
    >
      <TaskCard
        task={task}
        onClick={handleClick}
        highlighted={highlighted}
        collaboratorBorderColor={collaboratorBorderColor}
      />
    </div>
  );
}
