"use client";

import { useState, useMemo } from "react";
import { Task } from "@/state/api";
import { FilterState } from "@/lib/filterTypes";
import { PRIORITY_BG_CLASSES } from "@/lib/priorityColors";
import { STATUS_BG_CLASSES } from "@/lib/statusColors";
import { applyFilters } from "@/lib/filterUtils";
import TaskDetailModal from "@/components/TaskDetailModal";

type Props = {
  sprintId: number;
  tasks: Task[];
  setIsModalNewTaskOpen: (isOpen: boolean) => void;
  filterState: FilterState;
  sprintStartDate?: string;
  sprintDueDate?: string;
};

const priorityColors = PRIORITY_BG_CLASSES;
const statusColors = STATUS_BG_CLASSES;

const TimelineView = ({ tasks, filterState, sprintStartDate, sprintDueDate }: Props) => {
  const [isTaskDetailModalOpen, setIsTaskDetailModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  const filteredTasks = applyFilters(tasks ?? [], filterState);
  
  // Filter tasks that have both start and due dates
  const tasksWithDates = useMemo(() => {
    return filteredTasks.filter(task => task.startDate && task.dueDate);
  }, [filteredTasks]);

  // Calculate timeline boundaries based on sprint dates
  const { minDate, maxDate, totalDays } = useMemo(() => {
    if (!sprintStartDate || !sprintDueDate) {
      // Fallback to a default range if sprint dates aren't available
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      return {
        minDate: today,
        maxDate: nextWeek,
        totalDays: 7,
      };
    }

    const min = new Date(sprintStartDate);
    const max = new Date(sprintDueDate);
    
    const days = Math.ceil((max.getTime() - min.getTime()) / (1000 * 60 * 60 * 24));
    
    return { minDate: min, maxDate: max, totalDays: days };
  }, [sprintStartDate, sprintDueDate]);

  // Generate date headers
  const dateHeaders = useMemo(() => {
    const headers = [];
    const current = new Date(minDate);
    
    for (let i = 0; i <= totalDays; i++) {
      headers.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return headers;
  }, [minDate, totalDays]);

  const getWeekNumber = (date: Date): number => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };

  // Generate week headers
  const weekHeaders = useMemo(() => {
    const weeks: { weekLabel: string; startIndex: number; span: number }[] = [];
    let currentWeekStart = 0;
    let currentWeekNumber: number | null = null;
    
    dateHeaders.forEach((date, index) => {
      const weekNumber = getWeekNumber(date);
      
      if (currentWeekNumber === null) {
        currentWeekNumber = weekNumber;
      }
      
      if (weekNumber !== currentWeekNumber || index === dateHeaders.length - 1) {
        const span = index === dateHeaders.length - 1 && weekNumber === currentWeekNumber 
          ? index - currentWeekStart + 1 
          : index - currentWeekStart;
        
        weeks.push({
          weekLabel: `Week ${currentWeekNumber}`,
          startIndex: currentWeekStart,
          span: span,
        });
        
        currentWeekStart = index;
        currentWeekNumber = weekNumber;
      }
    });
    
    return weeks;
  }, [dateHeaders]);

  const calculatePosition = (date: Date) => {
    const daysSinceStart = (date.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);
    return (daysSinceStart / totalDays) * 100;
  };

  // Calculate today's position
  const todayPosition = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (today >= minDate && today <= maxDate) {
      return calculatePosition(today);
    }
    return null;
  }, [minDate, maxDate, totalDays]);

  const handleTaskClick = (taskId: number) => {
    setSelectedTaskId(taskId);
    setIsTaskDetailModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsTaskDetailModalOpen(false);
    setSelectedTaskId(null);
  };

  const selectedTask = tasks?.find((t) => t.id === selectedTaskId) || null;

  if (!tasks || tasks.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center px-4 pb-8 xl:px-6">
        <p className="text-gray-500 dark:text-gray-400">No tasks in this sprint</p>
      </div>
    );
  }

  if (!sprintStartDate || !sprintDueDate) {
    return (
      <div className="flex h-96 items-center justify-center px-4 pb-8 xl:px-6">
        <p className="text-gray-500 dark:text-gray-400">
          Sprint must have start and due dates to display timeline
        </p>
      </div>
    );
  }

  if (tasksWithDates.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center px-4 pb-8 xl:px-6">
        <p className="text-gray-500 dark:text-gray-400">
          No tasks with start and due dates to display on timeline
        </p>
      </div>
    );
  }

  const DAY_WIDTH = 40;

  return (
    <div className="px-4 pb-8 xl:px-6">
      <div className="overflow-x-auto">
        <div style={{ minWidth: `${totalDays * DAY_WIDTH}px` }}>
          {/* Week Headers */}
          <div className="mb-2 flex border-b border-gray-300 dark:border-gray-600">
            <div className="relative flex">
              {weekHeaders.map((week, index) => (
                <div
                  key={index}
                  className="border-l border-gray-300 px-2 py-2 text-center text-sm font-semibold text-gray-800 dark:border-gray-600 dark:text-gray-200"
                  style={{ width: `${week.span * DAY_WIDTH}px` }}
                >
                  {week.weekLabel}
                </div>
              ))}
            </div>
          </div>

          {/* Date Headers */}
          <div className="mb-4 flex border-b border-gray-200 dark:border-stroke-dark">
            <div className="relative flex">
              {dateHeaders.map((date, index) => {
                const isToday = date.toDateString() === new Date().toDateString();
                return (
                  <div
                    key={index}
                    className={`flex-shrink-0 border-l border-gray-200 px-1 py-2 text-center text-xs dark:border-stroke-dark ${
                      isToday ? "bg-blue-50 dark:bg-blue-900/20" : ""
                    }`}
                    style={{ width: `${DAY_WIDTH}px` }}
                  >
                    <div className={`font-medium ${isToday ? "text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"}`}>
                      {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>
                    <div className={`${isToday ? "text-blue-500 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"}`}>
                      {date.toLocaleDateString("en-US", { weekday: "short" })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Task Rows */}
          <div className="space-y-2">
            {tasksWithDates.map((task) => {
              const taskStartDate = new Date(task.startDate!);
              const taskDueDate = new Date(task.dueDate!);
              
              // Check if task is completely outside sprint (starts after sprint ends)
              const isOutsideSprint = taskStartDate > maxDate;
              
              if (isOutsideSprint) {
                // Show shaded bar for tasks outside sprint
                return (
                  <div key={task.id}>
                    {/* Shaded Timeline Bar */}
                    <div className="relative" style={{ width: `${totalDays * DAY_WIDTH}px` }}>
                      <div className="relative h-8">
                        {/* Grid lines */}
                        {dateHeaders.map((_, index) => (
                          <div
                            key={index}
                            className="absolute top-0 h-full border-l border-gray-100 dark:border-gray-800"
                            style={{ left: `${index * DAY_WIDTH}px` }}
                          />
                        ))}

                        {/* Shaded bar spanning full width */}
                        <button
                          onClick={() => handleTaskClick(task.id)}
                          className="absolute top-1 h-6 w-full rounded bg-gray-200 dark:bg-gray-800 opacity-50 flex items-center justify-center cursor-pointer transition-all hover:opacity-60"
                          title={`${task.title} - Starts after sprint (${taskStartDate.toLocaleDateString()})`}
                        >
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {task.title} ({task.taskAssignments?.[0]?.user.username || "Unassigned"}) - Starts after sprint
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }
              
              // Cap task dates to sprint boundaries
              const startDate = taskStartDate < minDate ? minDate : taskStartDate;
              const dueDate = taskDueDate > maxDate ? maxDate : taskDueDate;
              
              const startPos = calculatePosition(startDate);
              const endPos = calculatePosition(dueDate);
              const width = endPos - startPos;

              // Check if task extends beyond sprint boundaries
              const startsBeforeSprint = taskStartDate < minDate;
              const endsAfterSprint = taskDueDate > maxDate;

              return (
                <div key={task.id}>
                  {/* Timeline Bar */}
                  <div className="relative" style={{ width: `${totalDays * DAY_WIDTH}px` }}>
                    <div className="relative h-8">
                      {/* Grid lines */}
                      {dateHeaders.map((_, index) => (
                        <div
                          key={index}
                          className="absolute top-0 h-full border-l border-gray-100 dark:border-gray-800"
                          style={{ left: `${index * DAY_WIDTH}px` }}
                        />
                      ))}

                      {/* Today indicator */}
                      {todayPosition !== null && (
                        <div
                          className="absolute top-0 h-full w-0.5 bg-blue-500 dark:bg-blue-400 z-10"
                          style={{ left: `${(todayPosition / 100) * totalDays * DAY_WIDTH}px` }}
                        />
                      )}

                      {/* Task bar */}
                      <button
                        onClick={() => handleTaskClick(task.id)}
                        className="absolute top-1 h-6 rounded cursor-pointer transition-all hover:opacity-80 hover:shadow-md z-20"
                        style={{
                          left: `${(startPos / 100) * totalDays * DAY_WIDTH}px`,
                          width: `${(width / 100) * totalDays * DAY_WIDTH}px`,
                          minWidth: '40px',
                        }}
                        title={`${task.title} - ${task.taskAssignments?.[0]?.user.username || "Unassigned"} (${taskStartDate.toLocaleDateString()} - ${taskDueDate.toLocaleDateString()})${startsBeforeSprint ? ' - Starts before sprint' : ''}${endsAfterSprint ? ' - Extends beyond sprint' : ''}`}
                      >
                        <div
                          className={`h-full rounded px-2 text-xs font-medium text-white flex items-center justify-between ${
                            statusColors[task.status || "Input Queue"]
                          } ${startsBeforeSprint ? 'rounded-l-none' : ''} ${endsAfterSprint ? 'rounded-r-none' : ''}`}
                        >
                          <span className="truncate">{task.title} ({task.taskAssignments?.[0]?.user.username || "Unassigned"})</span>
                          <span
                            className={`ml-1 h-2 w-2 rounded-full flex-shrink-0 ${
                              priorityColors[task.priority || "Medium"]
                            }`}
                          />
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <TaskDetailModal
        isOpen={isTaskDetailModalOpen}
        onClose={handleCloseModal}
        task={selectedTask}
        tasks={tasks || []}
      />
    </div>
  );
};

export default TimelineView;
