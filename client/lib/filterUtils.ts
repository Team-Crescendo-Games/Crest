import { Task, Priority } from "@/state/api";
import { FilterState, DueDateOption, TaskStatus } from "@/lib/filterTypes";
import { parseLocalDate } from "@/lib/dateUtils";

/**
 * Checks if any filters are currently active.
 */
export function isFilterActive(filterState: FilterState): boolean {
  return (
    filterState.selectedTagIds.length > 0 ||
    filterState.selectedPriorities.length > 0 ||
    filterState.selectedDueDateOptions.length > 0 ||
    filterState.selectedAssigneeIds.length > 0 ||
    filterState.selectedStatuses.length > 0 ||
    filterState.selectedBoardIds.length > 0 ||
    filterState.searchText.trim().length > 0 ||
    !!(filterState.timeRange?.startDate || filterState.timeRange?.endDate)
  );
}

/**
 * Checks if a task matches the tag filter criteria (OR logic within tags).
 */
export function matchesTagFilter(
  task: Task,
  selectedTagIds: number[],
): boolean {
  // If no tags selected, all tasks pass
  if (selectedTagIds.length === 0) {
    return true;
  }

  // Task must have at least one tag that matches a selected tag ID
  const taskTagIds = task.taskTags?.map((tt) => tt.tagId) ?? [];
  return taskTagIds.some((tagId) => selectedTagIds.includes(tagId));
}

/**
 * Checks if a task matches the priority filter criteria (OR logic within priorities).
 */
export function matchesPriorityFilter(
  task: Task,
  selectedPriorities: Priority[],
): boolean {
  // If no priorities selected, all tasks pass
  if (selectedPriorities.length === 0) {
    return true;
  }

  // Task must have a priority that matches one of the selected priorities
  if (!task.priority) {
    return false;
  }

  return selectedPriorities.includes(task.priority);
}

/**
 * Checks if a task matches the status filter criteria (OR logic within statuses).
 */
export function matchesStatusFilter(
  task: Task,
  selectedStatuses: TaskStatus[],
): boolean {
  // If no statuses selected, all tasks pass
  if (selectedStatuses.length === 0) {
    return true;
  }

  // Task must have a status that matches one of the selected statuses
  if (!task.status) {
    return false;
  }

  return selectedStatuses.includes(task.status as TaskStatus);
}

/**
 * Checks if a date string represents an overdue date (before today).
 */
export function isOverdue(dueDate: string): boolean {
  const due = new Date(dueDate);
  const today = new Date();
  // Set both to start of day for date-only comparison
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return due < today;
}

/**
 * Checks if a date string represents today's date.
 */
export function isDueToday(dueDate: string): boolean {
  const due = new Date(dueDate);
  const today = new Date();
  return (
    due.getFullYear() === today.getFullYear() &&
    due.getMonth() === today.getMonth() &&
    due.getDate() === today.getDate()
  );
}

/**
 * Checks if a date string falls within the current week (Monday through Sunday).
 */
export function isDueThisWeek(dueDate: string): boolean {
  const due = new Date(dueDate);
  const today = new Date();

  // Get the start of the week (Monday)
  const startOfWeek = new Date(today);
  const dayOfWeek = today.getDay();
  // Adjust for Monday start (Sunday = 0, so we need to go back 6 days; Monday = 1, go back 0 days)
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  startOfWeek.setDate(today.getDate() - daysToMonday);
  startOfWeek.setHours(0, 0, 0, 0);

  // Get the end of the week (Sunday)
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  // Set due date to start of day for comparison
  due.setHours(0, 0, 0, 0);

  return due >= startOfWeek && due <= endOfWeek;
}

/**
 * Checks if a date string falls within the current month.
 */
export function isDueThisMonth(dueDate: string): boolean {
  const due = new Date(dueDate);
  const today = new Date();
  return (
    due.getFullYear() === today.getFullYear() &&
    due.getMonth() === today.getMonth()
  );
}

/**
 * Checks if a task matches the due date filter criteria (OR logic within options).
 */
export function matchesDueDateFilter(
  task: Task,
  selectedDueDateOptions: DueDateOption[],
): boolean {
  // If no due date options selected, all tasks pass
  if (selectedDueDateOptions.length === 0) {
    return true;
  }

  const dueDate = task.dueDate;

  // Check each selected option (OR logic - task passes if it matches ANY option)
  for (const option of selectedDueDateOptions) {
    switch (option) {
      case "noDueDate":
        // Task matches if it has no due date
        if (!dueDate || dueDate.trim() === "") {
          return true;
        }
        break;
      case "overdue":
        if (dueDate && isOverdue(dueDate)) {
          return true;
        }
        break;
      case "dueToday":
        if (dueDate && isDueToday(dueDate)) {
          return true;
        }
        break;
      case "dueThisWeek":
        if (dueDate && isDueThisWeek(dueDate)) {
          return true;
        }
        break;
      case "dueThisMonth":
        if (dueDate && isDueThisMonth(dueDate)) {
          return true;
        }
        break;
    }
  }

  return false;
}

/**
 * Checks if a task matches the assignee filter criteria.
 * Task passes if its assignee's userId is in selectedAssigneeIds (OR logic).
 * If selectedAssigneeIds is empty, all tasks pass.
 *
 * @param task - The task to check
 * @param selectedAssigneeIds - Array of selected user IDs
 * @returns true if task matches the assignee filter or no assignees are selected
 */
export function matchesAssigneeFilter(
  task: Task,
  selectedAssigneeIds: number[],
): boolean {
  // If no assignees selected, all tasks pass
  if (selectedAssigneeIds.length === 0) {
    return true;
  }

  // Task must have an assignee that matches one of the selected user IDs
  // Check taskAssignments for multi-assignee support
  const assigneeIds = task.taskAssignments?.map((ta) => ta.userId) ?? [];
  if (assigneeIds.length === 0) {
    return false;
  }

  return assigneeIds.some((id) => selectedAssigneeIds.includes(id));
}

/**
 * Checks if a task matches the search text filter.
 * Task passes if its title or description contains the search text (case-insensitive).
 * If searchText is empty, all tasks pass.
 *
 * @param task - The task to check
 * @param searchText - The search text to match
 * @returns true if task matches the search text or search is empty
 */
export function matchesSearchText(task: Task, searchText: string): boolean {
  const trimmed = searchText.trim().toLowerCase();
  if (trimmed.length === 0) {
    return true;
  }

  const titleMatch = task.title?.toLowerCase().includes(trimmed) ?? false;
  const descMatch = task.description?.toLowerCase().includes(trimmed) ?? false;

  return titleMatch || descMatch;
}

/**
 * Checks if a task matches the board filter criteria (OR logic within boards).
 * Task passes if its projectId is in selectedBoardIds.
 * If selectedBoardIds is empty, all tasks pass.
 *
 * @param task - The task to check
 * @param selectedBoardIds - Array of selected project/board IDs
 * @returns true if task matches the board filter or no boards are selected
 */
export function matchesBoardFilter(
  task: Task,
  selectedBoardIds: number[],
): boolean {
  // If no boards selected, all tasks pass
  if (selectedBoardIds.length === 0) {
    return true;
  }

  // Task must belong to one of the selected boards
  if (!task.projectId) {
    return false;
  }

  return selectedBoardIds.includes(task.projectId);
}

/**
 * Checks if a task matches the time range filter.
 * Task passes if its startDate OR dueDate falls within the specified range.
 * If no time range is set, all tasks pass.
 * If startDate is null, assumes distant past (no lower bound).
 * If endDate is null, assumes distant future (no upper bound).
 *
 * @param task - The task to check
 * @param timeRange - The time range filter (startDate and/or endDate)
 * @returns true if task matches the time range or no range is set
 */
export function matchesTimeRange(
  task: Task,
  timeRange: FilterState["timeRange"],
): boolean {
  // If no time range set at all, all tasks pass
  if (!timeRange || (!timeRange.startDate && !timeRange.endDate)) {
    return true;
  }

  // Parse filter dates using parseLocalDate (YYYY-MM-DD format)
  // Default to extreme dates if null (effectively no bound)
  const rangeStart = timeRange.startDate
    ? parseLocalDate(timeRange.startDate)
    : new Date(1900, 0, 1); // Jan 1, 1900 - distant past
  const rangeEnd = timeRange.endDate
    ? parseLocalDate(timeRange.endDate)
    : new Date(2999, 11, 31); // Dec 31, 2999 - distant future

  // Set range dates to appropriate times for comparison
  rangeStart.setHours(0, 0, 0, 0);
  rangeEnd.setHours(23, 59, 59, 999);

  // Helper to parse task dates (can be ISO string or YYYY-MM-DD)
  const parseTaskDate = (dateStr: string): Date => {
    // If it's an ISO string with T, use Date constructor
    if (dateStr.includes("T")) {
      return new Date(dateStr);
    }
    // Otherwise use parseLocalDate for YYYY-MM-DD
    return parseLocalDate(dateStr);
  };

  // Check if task's startDate falls in range
  if (task.startDate) {
    const taskStart = parseTaskDate(task.startDate);
    if (taskStart >= rangeStart && taskStart <= rangeEnd) {
      return true;
    }
  }

  // Check if task's dueDate falls in range
  if (task.dueDate) {
    const taskDue = parseTaskDate(task.dueDate);
    if (taskDue >= rangeStart && taskDue <= rangeEnd) {
      return true;
    }
  }

  // If task has neither startDate nor dueDate, it doesn't match a time range filter
  return false;
}

/**
 * Applies all active filters to an array of tasks.
 * Uses AND logic between categories, OR logic within categories.
 */
export function applyFilters(tasks: Task[], filterState: FilterState): Task[] {
  return tasks.filter((task) => {
    // AND logic between categories - task must pass ALL category filters
    const passesTagFilter = matchesTagFilter(task, filterState.selectedTagIds);
    const passesPriorityFilter = matchesPriorityFilter(
      task,
      filterState.selectedPriorities,
    );
    const passesStatusFilter = matchesStatusFilter(
      task,
      filterState.selectedStatuses,
    );
    const passesDueDateFilter = matchesDueDateFilter(
      task,
      filterState.selectedDueDateOptions,
    );
    const passesAssigneeFilter = matchesAssigneeFilter(
      task,
      filterState.selectedAssigneeIds,
    );
    const passesBoardFilter = matchesBoardFilter(
      task,
      filterState.selectedBoardIds,
    );
    const passesSearchText = matchesSearchText(task, filterState.searchText);
    const passesTimeRange = matchesTimeRange(task, filterState.timeRange);

    return (
      passesTagFilter &&
      passesPriorityFilter &&
      passesStatusFilter &&
      passesDueDateFilter &&
      passesAssigneeFilter &&
      passesBoardFilter &&
      passesSearchText &&
      passesTimeRange
    );
  });
}

import { SortState, SortField } from "@/lib/filterTypes";

/**
 * Priority order for sorting (lower number = higher priority)
 */
export const priorityOrder: Record<Priority, number> = {
  [Priority.Urgent]: 1,
  [Priority.High]: 2,
  [Priority.Medium]: 3,
  [Priority.Low]: 4,
  [Priority.Backlog]: 5,
};

/**
 * Status order for sorting (follows workflow: Input Queue → WIP → Review → Done)
 */
export const statusOrder: Record<string, number> = {
  "Input Queue": 0,
  "Work In Progress": 1,
  Review: 2,
  Done: 3,
};

/**
 * Checks if sorting is currently active.
 */
export function isSortActive(sortState: SortState): boolean {
  return sortState.field !== "none";
}

/**
 * Applies sorting to an array of tasks.
 */
export function applySorting(tasks: Task[], sortState: SortState): Task[] {
  if (sortState.field === "none") {
    return tasks;
  }

  const sorted = [...tasks].sort((a, b) => {
    let comparison = 0;

    switch (sortState.field) {
      case "dueDate":
        // Tasks without due dates go to the end
        if (!a.dueDate && !b.dueDate) comparison = 0;
        else if (!a.dueDate) comparison = 1;
        else if (!b.dueDate) comparison = -1;
        else
          comparison =
            new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        break;

      case "priority":
        // Tasks without priority go to the end
        const aPriority = a.priority ? priorityOrder[a.priority] : 999;
        const bPriority = b.priority ? priorityOrder[b.priority] : 999;
        comparison = aPriority - bPriority;
        break;

      case "points":
        // Tasks without points go to the end
        const aPoints = a.points ?? -1;
        const bPoints = b.points ?? -1;
        comparison = aPoints - bPoints;
        break;
    }

    return sortState.direction === "asc" ? comparison : -comparison;
  });

  return sorted;
}
