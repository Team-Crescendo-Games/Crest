"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Task, useUpdateTaskMutation } from "@/state/api";
import { useAuthUser } from "@/lib/useAuthUser";
import { FilterState, SortState, initialSortState } from "@/lib/filterTypes";
import { PRIORITY_COLORS_BY_NAME } from "@/lib/priorityColors";
import { STATUS_BG_CLASSES } from "@/lib/statusColors";
import { APP_ACCENT_LIGHT, SPRINT_MAIN_COLOR } from "@/lib/entityColors";
import { applyFilters, applySorting } from "@/lib/filterUtils";
import { parseLocalDate, localDateObjToUTC } from "@/lib/dateUtils";
import TaskDetailModal from "@/components/tasks/taskDetailModal";
import UserIcon from "@/components/UserIcon";
import { Plus } from "lucide-react";

type Props = {
  sprintId: number;
  tasks: Task[];
  setIsModalNewTaskOpen: (isOpen: boolean) => void;
  filterState: FilterState;
  sortState?: SortState;
  sprintStartDate?: string;
  sprintDueDate?: string;
  showMyTasks?: boolean;
};

const statusColors = STATUS_BG_CLASSES;

const TimelineView = ({
  tasks,
  setIsModalNewTaskOpen,
  filterState,
  sortState = initialSortState,
  sprintStartDate,
  sprintDueDate,
  showMyTasks = false,
}: Props) => {
  const [isTaskDetailModalOpen, setIsTaskDetailModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Drag state
  const [dragging, setDragging] = useState<{
    taskId: number;
    endpoint: "start" | "end" | "bar";
    initialMouseX?: number;
    taskDuration?: number;
  } | null>(null);
  const [dragPreview, setDragPreview] = useState<{
    taskId: number;
    startDate: Date;
    dueDate: Date;
  } | null>(null);
  const [pendingUpdate, setPendingUpdate] = useState<{
    taskId: number;
    startDate: Date;
    dueDate: Date;
  } | null>(null);

  const [updateTask] = useUpdateTaskMutation();
  const { data: authData } = useAuthUser();
  const currentUserId = authData?.userDetails?.userId;

  // Measure container width
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  const filteredTasks = applyFilters(tasks ?? [], filterState);
  const sortedTasks = applySorting(filteredTasks, sortState);

  // Filter tasks that have both start and due dates
  const tasksWithDates = useMemo(() => {
    return sortedTasks.filter((task) => task.startDate && task.dueDate);
  }, [sortedTasks]);

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

    const min = parseLocalDate(sprintStartDate);
    const max = parseLocalDate(sprintDueDate);

    const days = Math.ceil(
      (max.getTime() - min.getTime()) / (1000 * 60 * 60 * 24),
    );

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
    const pastDaysOfYear =
      (date.getTime() - firstDayOfYear.getTime()) / 86400000;
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

      if (
        weekNumber !== currentWeekNumber ||
        index === dateHeaders.length - 1
      ) {
        const span =
          index === dateHeaders.length - 1 && weekNumber === currentWeekNumber
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

  // Calculate day width based on container
  const DAY_WIDTH = useMemo(() => {
    return containerWidth > 0 && totalDays > 0
      ? Math.max(40, containerWidth / (totalDays + 1))
      : 40;
  }, [containerWidth, totalDays]);

  const calculatePosition = (date: Date) => {
    const daysSinceStart =
      (date.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);
    return (daysSinceStart / totalDays) * 100;
  };

  // Convert pixel position to date
  const pixelToDate = useCallback(
    (pixelX: number): Date => {
      const dayIndex = Math.round(pixelX / DAY_WIDTH);
      const clampedIndex = Math.max(0, Math.min(totalDays, dayIndex));
      const newDate = new Date(minDate);
      newDate.setDate(minDate.getDate() + clampedIndex);
      return newDate;
    },
    [minDate, totalDays, DAY_WIDTH],
  );

  // Handle drag start
  const handleDragStart = useCallback(
    (
      e: React.MouseEvent,
      taskId: number,
      endpoint: "start" | "end" | "bar",
    ) => {
      e.stopPropagation();
      e.preventDefault();

      const task = tasksWithDates.find((t) => t.id === taskId);
      if (task) {
        const startDate = parseLocalDate(task.startDate!);
        const dueDate = parseLocalDate(task.dueDate!);
        const taskDuration = Math.round(
          (dueDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        setDragging({
          taskId,
          endpoint,
          initialMouseX: e.clientX,
          taskDuration,
        });
        setDragPreview({
          taskId,
          startDate,
          dueDate,
        });
      }
    },
    [tasksWithDates],
  );

  // Handle drag move
  const handleDragMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging || !containerRef.current || !dragPreview) return;

      const rect = containerRef.current.getBoundingClientRect();
      const pixelX = e.clientX - rect.left;
      const newDate = pixelToDate(pixelX);

      if (dragging.endpoint === "start") {
        // Don't allow start date to go past due date
        if (newDate < dragPreview.dueDate) {
          setDragPreview((prev) =>
            prev ? { ...prev, startDate: newDate } : null,
          );
        }
      } else if (dragging.endpoint === "end") {
        // Don't allow due date to go before start date
        if (newDate > dragPreview.startDate) {
          setDragPreview((prev) =>
            prev ? { ...prev, dueDate: newDate } : null,
          );
        }
      } else if (
        dragging.endpoint === "bar" &&
        dragging.taskDuration !== undefined
      ) {
        // Move entire bar - calculate new start date and maintain duration
        const newStartDate = new Date(newDate);
        const newDueDate = new Date(newStartDate);
        newDueDate.setDate(newStartDate.getDate() + dragging.taskDuration);

        // Clamp to sprint boundaries
        if (newStartDate >= minDate && newDueDate <= maxDate) {
          setDragPreview((prev) =>
            prev
              ? {
                  ...prev,
                  startDate: newStartDate,
                  dueDate: newDueDate,
                }
              : null,
          );
        }
      }
    },
    [dragging, dragPreview, pixelToDate, minDate, maxDate],
  );

  // Handle drag end
  const handleDragEnd = useCallback(async () => {
    if (!dragging || !dragPreview) {
      setDragging(null);
      setDragPreview(null);
      return;
    }

    // Store the pending update to prevent flickering
    setPendingUpdate({
      taskId: dragging.taskId,
      startDate: dragPreview.startDate,
      dueDate: dragPreview.dueDate,
    });

    setDragging(null);
    setDragPreview(null);

    try {
      await updateTask({
        id: dragging.taskId,
        startDate: localDateObjToUTC(dragPreview.startDate),
        dueDate: localDateObjToUTC(dragPreview.dueDate),
      });
    } catch (error) {
      console.error("Failed to update task dates:", error);
    } finally {
      // Clear pending update after a short delay to allow cache to update
      setTimeout(() => setPendingUpdate(null), 100);
    }
  }, [dragging, dragPreview, updateTask]);

  // Add global mouse event listeners for dragging
  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", handleDragMove);
      window.addEventListener("mouseup", handleDragEnd);
      return () => {
        window.removeEventListener("mousemove", handleDragMove);
        window.removeEventListener("mouseup", handleDragEnd);
      };
    }
  }, [dragging, handleDragMove, handleDragEnd]);

  // Calculate today's position
  const todayPosition = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (today >= minDate && today <= maxDate) {
      return calculatePosition(today);
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Create Task Button component
  const CreateTaskButton = () => (
    <div className="mb-4">
      <button
        onClick={() => setIsModalNewTaskOpen(true)}
        className="flex items-center gap-2 rounded-md border-2 border-dashed border-gray-300 bg-white/50 px-4 py-2 text-gray-500 transition-colors hover:border-gray-400 hover:bg-white hover:text-gray-700 dark:border-stroke-dark dark:bg-dark-secondary/50 dark:text-neutral-500 dark:hover:border-neutral-500 dark:hover:bg-dark-secondary dark:hover:text-neutral-300"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200/70 dark:bg-dark-tertiary/70">
          <Plus size={14} />
        </span>
        <span className="text-sm font-medium">Create Task</span>
      </button>
    </div>
  );

  if (!tasks || tasks.length === 0) {
    return (
      <div className="px-4 pb-8 pt-4 xl:px-6">
        <CreateTaskButton />
        <div className="flex h-80 items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">
            No tasks in this sprint
          </p>
        </div>
      </div>
    );
  }

  if (!sprintStartDate || !sprintDueDate) {
    return (
      <div className="px-4 pb-8 pt-4 xl:px-6">
        <CreateTaskButton />
        <div className="flex h-80 items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">
            Sprint must have start and due dates to display timeline
          </p>
        </div>
      </div>
    );
  }

  if (tasksWithDates.length === 0) {
    return (
      <div className="px-4 pb-8 pt-4 xl:px-6">
        <CreateTaskButton />
        <div className="flex h-80 items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">
            No tasks with start and due dates to display on timeline
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full px-4 pb-4 pt-4 xl:px-6">
      <CreateTaskButton />
      <div ref={containerRef} style={{ width: "100%" }}>
        {/* Week Headers */}
        <div className="mb-2 flex border-b border-t border-gray-300 dark:border-gray-600">
          <div className="relative flex">
            {weekHeaders.map((week, index) => (
              <div
                key={index}
                className={`border-l border-gray-300 px-2 py-2 text-center text-sm font-semibold text-gray-800 dark:border-gray-600 dark:text-gray-200 ${
                  index === weekHeaders.length - 1 ? "border-r" : ""
                }`}
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
              const isLast = index === dateHeaders.length - 1;
              return (
                <div
                  key={index}
                  className={`flex-shrink-0 border-l border-gray-200 px-1 py-2 text-center text-xs dark:border-stroke-dark ${
                    isToday ? "" : ""
                  } ${isLast ? "border-r" : ""}`}
                  style={
                    isToday
                      ? {
                          backgroundColor: `${SPRINT_MAIN_COLOR}10`,
                          width: `${DAY_WIDTH}px`,
                        }
                      : { width: `${DAY_WIDTH}px` }
                  }
                >
                  <div
                    className={`font-medium ${isToday ? "font-bold" : "text-gray-700 dark:text-gray-300"}`}
                    style={isToday ? { color: SPRINT_MAIN_COLOR } : undefined}
                  >
                    {date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                  <div
                    className={`${isToday ? "font-bold" : "text-gray-500 dark:text-gray-400"}`}
                    style={isToday ? { color: SPRINT_MAIN_COLOR } : undefined}
                  >
                    {date.toLocaleDateString("en-US", { weekday: "short" })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Task Rows */}
        <div className="space-y-2 border-t border-dashed border-gray-300 pt-2 dark:border-gray-700/50">
          {tasksWithDates.map((task) => {
            const taskStartDate = parseLocalDate(task.startDate!);
            const taskDueDate = parseLocalDate(task.dueDate!);

            // Check if task is assigned to current user (for highlighting)
            const isMyTask =
              showMyTasks &&
              !!currentUserId &&
              task.taskAssignments?.some((ta) => ta.userId === currentUserId);

            // Check if task is completely outside sprint (starts after sprint ends)
            const isOutsideSprint = taskStartDate > maxDate;

            if (isOutsideSprint) {
              // Show shaded bar for tasks outside sprint
              return (
                <div key={task.id}>
                  {/* Shaded Timeline Bar */}
                  <div
                    className="relative"
                    style={{ width: `${(totalDays + 1) * DAY_WIDTH}px` }}
                  >
                    <div className="relative h-8">
                      {/* Grid lines */}
                      {dateHeaders.map((_, index) => (
                        <div
                          key={index}
                          className="absolute top-0 h-full border-l border-dashed border-gray-300 dark:border-gray-700/50"
                          style={{ left: `${index * DAY_WIDTH}px` }}
                        />
                      ))}

                      {/* Shaded bar spanning full width */}
                      <button
                        onClick={() => handleTaskClick(task.id)}
                        className="absolute top-1 flex h-6 w-full cursor-pointer items-center justify-center rounded bg-gray-200 opacity-50 transition-all hover:opacity-60 dark:bg-gray-800"
                        style={
                          isMyTask
                            ? {
                                outline: `2px solid ${APP_ACCENT_LIGHT}`,
                                outlineOffset: "-1px",
                              }
                            : undefined
                        }
                        title={`${task.title} - Starts after sprint (${taskStartDate.toLocaleDateString()})`}
                      >
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {task.title} (
                          {task.taskAssignments?.[0]?.user.username ||
                            "Unassigned"}
                          ) - Starts after sprint
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

            // Add one day's width so the task bar extends through the end date (not just to its start)
            const oneDayPercent = (1 / totalDays) * 100;

            // Check if task extends beyond sprint boundaries
            const startsBeforeSprint = taskStartDate < minDate;
            const endsAfterSprint = taskDueDate > maxDate;

            // Use drag preview dates if this task is being dragged, or pending update
            const activePreview =
              dragPreview?.taskId === task.id
                ? dragPreview
                : pendingUpdate?.taskId === task.id
                  ? pendingUpdate
                  : null;
            const displayStartDate = activePreview
              ? activePreview.startDate
              : startDate;
            const displayDueDate = activePreview
              ? activePreview.dueDate
              : dueDate;

            const displayStartPos = calculatePosition(displayStartDate);
            const displayEndPos = calculatePosition(displayDueDate);
            const displayWidth =
              displayEndPos - displayStartPos + oneDayPercent;

            // Determine if endpoints are draggable (not beyond sprint scope)
            const canDragStart = !startsBeforeSprint;
            const canDragEnd = !endsAfterSprint;
            const canDragBar = canDragStart && canDragEnd;

            return (
              <div key={task.id}>
                {/* Timeline Bar */}
                <div
                  className="relative"
                  style={{ width: `${(totalDays + 1) * DAY_WIDTH}px` }}
                >
                  <div className="relative h-8">
                    {/* Grid lines */}
                    {dateHeaders.map((_, index) => (
                      <div
                        key={index}
                        className="absolute top-0 h-full border-l border-dashed border-gray-300 dark:border-gray-700/50"
                        style={{ left: `${index * DAY_WIDTH}px` }}
                      />
                    ))}

                    {/* Today indicator */}
                    {todayPosition !== null && (
                      <div
                        className="absolute top-0 z-10 h-full w-0.5"
                        style={{
                          backgroundColor: SPRINT_MAIN_COLOR,
                          left: `${(todayPosition / 100) * totalDays * DAY_WIDTH}px`,
                        }}
                      />
                    )}

                    {/* Task bar with drag handles */}
                    <div
                      className="group absolute top-1 z-20 h-6"
                      style={{
                        left: `${(displayStartPos / 100) * totalDays * DAY_WIDTH}px`,
                        width: `${(displayWidth / 100) * totalDays * DAY_WIDTH}px`,
                        minWidth: "40px",
                      }}
                    >
                      {/* Left drag handle */}
                      {canDragStart && (
                        <div
                          onMouseDown={(e) =>
                            handleDragStart(e, task.id, "start")
                          }
                          className="absolute left-0 top-0 z-30 h-full w-2 cursor-ew-resize opacity-0 transition-opacity group-hover:opacity-100"
                          style={{ transform: "translateX(-50%)" }}
                        >
                          <div className="mx-auto h-full w-1 rounded-full bg-white/80 shadow dark:bg-gray-300/80" />
                        </div>
                      )}

                      {/* Main task bar (clickable or draggable) */}
                      <div
                        onMouseDown={
                          canDragBar
                            ? (e) => handleDragStart(e, task.id, "bar")
                            : undefined
                        }
                        onClick={() => !dragging && handleTaskClick(task.id)}
                        className={`flex h-full w-full overflow-hidden rounded transition-all hover:opacity-80 hover:shadow-md ${
                          dragging?.taskId === task.id ? "opacity-70" : ""
                        } ${canDragBar ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}`}
                        style={
                          isMyTask
                            ? {
                                outline: `2px solid ${APP_ACCENT_LIGHT}`,
                                outlineOffset: "-1px",
                              }
                            : undefined
                        }
                        title={`${task.title} - ${task.taskAssignments?.[0]?.user.username || "Unassigned"} (${taskStartDate.toLocaleDateString()} - ${taskDueDate.toLocaleDateString()})${startsBeforeSprint ? " - Starts before sprint" : ""}${endsAfterSprint ? " - Extends beyond sprint" : ""}${canDragBar ? " - Drag to move" : ""}`}
                      >
                        {/* Priority bar on left */}
                        {!startsBeforeSprint && (
                          <div
                            className="w-1 flex-shrink-0 rounded-l"
                            style={{
                              backgroundColor: task.priority
                                ? PRIORITY_COLORS_BY_NAME[task.priority]
                                : undefined,
                            }}
                          />
                        )}
                        <div
                          className={`flex h-full flex-1 items-center gap-1.5 px-2 text-xs font-medium text-white ${
                            statusColors[task.status || "Input Queue"]
                          } ${startsBeforeSprint ? "rounded-l" : ""} ${endsAfterSprint ? "" : "rounded-r"}`}
                        >
                          <span className="flex-1 truncate">{task.title}</span>
                          {task.taskAssignments?.[0]?.user && (
                            <UserIcon
                              userId={task.taskAssignments[0].user.userId}
                              username={task.taskAssignments[0].user.username}
                              fullName={task.taskAssignments[0].user.fullName}
                              profilePictureExt={
                                task.taskAssignments[0].user.profilePictureExt
                              }
                              size={18}
                              tooltipLabel="Assignee"
                              className="flex-shrink-0 ring-1 ring-white/30"
                            />
                          )}
                        </div>
                      </div>

                      {/* Right drag handle */}
                      {canDragEnd && (
                        <div
                          onMouseDown={(e) =>
                            handleDragStart(e, task.id, "end")
                          }
                          className="absolute right-0 top-0 z-30 h-full w-2 cursor-ew-resize opacity-0 transition-opacity group-hover:opacity-100"
                          style={{ transform: "translateX(50%)" }}
                        >
                          <div className="mx-auto h-full w-1 rounded-full bg-white/80 shadow dark:bg-gray-300/80" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
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
