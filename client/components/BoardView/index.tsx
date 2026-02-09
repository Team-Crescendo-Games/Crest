"use client";

import { useState } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Task as TaskType, useUpdateTaskStatusMutation, useGetAuthUserQuery } from "@/state/api";
import { Plus } from "lucide-react";
import type { DropTargetMonitor, DragSourceMonitor } from "react-dnd";
import TaskDetailModal from "@/components/TaskDetailModal";
import TaskCard from "@/components/TaskCard";
import { applyFilters, applySorting } from "@/lib/filterUtils";
import { FilterState, SortState, initialSortState } from "@/lib/filterTypes";
import { STATUS_COLORS_BY_NAME } from "@/lib/statusColors";

type BoardViewProps = {
  tasks: TaskType[];
  setIsModalNewTaskOpen: (isOpen: boolean) => void;
  filterState: FilterState;
  sortState?: SortState;
  showMyTasks?: boolean;
};

const taskStatus = ["Input Queue", "Work In Progress", "Review", "Done"];

const BoardView = ({ tasks, setIsModalNewTaskOpen, filterState, sortState = initialSortState, showMyTasks = false }: BoardViewProps) => {
  const [updateTaskStatus] = useUpdateTaskStatusMutation();
  const { data: authData } = useGetAuthUserQuery({});

  const currentUserId = authData?.userDetails?.userId;

  // Apply filters then sorting to tasks
  const filteredTasks = applyFilters(tasks, filterState);
  const sortedTasks = applySorting(filteredTasks, sortState);

  // Modal state management for task detail modal
  const [isTaskDetailModalOpen, setIsTaskDetailModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  // Derive selected task from fresh task data
  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || null;

  const handleTaskClick = (task: TaskType) => {
    setSelectedTaskId(task.id);
    setIsTaskDetailModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsTaskDetailModalOpen(false);
    setSelectedTaskId(null);
  };

  const moveTask = async (taskId: number, toStatus: string) => {
    try {
      const userId = authData?.userDetails?.userId;
      await updateTaskStatus({ taskId, status: toStatus, userId }).unwrap();
    } catch (error) {
      console.error("Failed to update task status:", error);
      // Optionally show an error message to the user
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
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
          />
        ))}
      </div>
      <TaskDetailModal
        isOpen={isTaskDetailModalOpen}
        onClose={handleCloseModal}
        task={selectedTask}
        tasks={tasks}
      />
    </DndProvider>
  );
};

type TaskColumnProps = {
  status: string;
  tasks: TaskType[];
  moveTask: (taskId: number, toStatus: string) => void;
  setIsModalNewTaskOpen: (isOpen: boolean) => void;
  onTaskClick: (task: TaskType) => void;
  showMyTasks: boolean;
  currentUserId?: number;
};

const TaskColumn = ({
  status,
  tasks,
  moveTask,
  setIsModalNewTaskOpen,
  onTaskClick,
  showMyTasks,
  currentUserId,
}: TaskColumnProps) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: "task",
    drop: (item: { id: number }) => moveTask(item.id, status),
    collect: (monitor: DropTargetMonitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  const statusTasks = tasks.filter((task) => task.status === status);
  const tasksCount = statusTasks.length;
  const totalPoints = statusTasks.reduce((sum, task) => sum + (task.points || 0), 0);

  return (
    <div
      ref={(instance) => {
        drop(instance);
      }}
      className={`
        flex min-h-0 flex-col
        rounded-lg py-4 px-3 xl:px-3 backdrop-blur-sm shadow-sm transition-all duration-200
        bg-gray-100/80 dark:bg-dark-secondary/80
        border border-gray-200/50 dark:border-stroke-dark/50
        ${isOver 
          ? "bg-gray-200 dark:bg-dark-tertiary border-gray-300 dark:border-stroke-dark shadow-md scale-[1.02]" 
          : ""
        }
      `}
    >
      <div className="mb-4 flex w-full flex-shrink-0 flex-col">
        <h3 className="flex items-center text-base font-semibold text-gray-800 dark:text-white">
          <span
            className="mr-2 h-3 w-3 rounded-full shadow-sm"
            style={{ backgroundColor: STATUS_COLORS_BY_NAME[status] }}
          />
          {status}{" "}
          <span className="ml-2 inline-block rounded-full bg-gray-100 px-2 py-1 text-center text-xs font-medium leading-none text-gray-600 dark:bg-dark-tertiary dark:text-gray-300">
            {tasksCount} tasks · {totalPoints} pts
          </span>
        </h3>
        <div className="mt-3 h-px bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-stroke-dark dark:via-gray-600 dark:to-stroke-dark" />
      </div>

      <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1 py-1">
        {status === "Input Queue" && (
        <button
          onClick={() => setIsModalNewTaskOpen(true)}
          className="mb-2 flex w-full items-center gap-2 rounded-md border-2 border-dashed border-gray-300 bg-white/50 p-3 text-gray-500 transition-colors hover:border-gray-400 hover:bg-white hover:text-gray-700 dark:border-stroke-dark dark:bg-dark-secondary/50 dark:text-neutral-500 dark:hover:border-neutral-500 dark:hover:bg-dark-secondary dark:hover:text-neutral-300"
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
            highlighted={showMyTasks && !!currentUserId && task.taskAssignments?.some((ta) => ta.userId === currentUserId)}
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
};

const DraggableTask = ({ task, onClick, highlighted }: DraggableTaskProps) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "task",
    item: { id: task.id },
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
      <TaskCard task={task} onClick={handleClick} highlighted={highlighted} />
    </div>
  );
};

export default BoardView;
