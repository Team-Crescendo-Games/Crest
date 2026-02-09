import { Task, Priority } from "@/state/api";
import { FilterState, DueDateOption } from "@/lib/filterTypes";

/**
 * Checks if any filters are currently active.
 */
export function isFilterActive(filterState: FilterState): boolean {
  return (
    filterState.selectedTagIds.length > 0 ||
    filterState.selectedPriorities.length > 0 ||
    filterState.selectedDueDateOptions.length > 0 ||
    filterState.selectedAssigneeIds.length > 0 ||
    filterState.searchText.trim().length > 0
  );
}

/**
 * Checks if a task matches the tag filter criteria (OR logic within tags).
 */
export function matchesTagFilter(
  task: Task,
  selectedTagIds: number[]
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
  selectedPriorities: Priority[]
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
  selectedDueDateOptions: DueDateOption[]
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
  selectedAssigneeIds: number[]
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
 * Applies all active filters to an array of tasks.
 * Uses AND logic between categories, OR logic within categories.
 */
export function applyFilters(tasks: Task[], filterState: FilterState): Task[] {
  return tasks.filter((task) => {
    // AND logic between categories - task must pass ALL category filters
    const passesTagFilter = matchesTagFilter(task, filterState.selectedTagIds);
    const passesPriorityFilter = matchesPriorityFilter(
      task,
      filterState.selectedPriorities
    );
    const passesDueDateFilter = matchesDueDateFilter(
      task,
      filterState.selectedDueDateOptions
    );
    const passesAssigneeFilter = matchesAssigneeFilter(
      task,
      filterState.selectedAssigneeIds
    );
    const passesSearchText = matchesSearchText(task, filterState.searchText);

    return passesTagFilter && passesPriorityFilter && passesDueDateFilter && passesAssigneeFilter && passesSearchText;
  });
}

import { SortState, SortField } from "@/lib/filterTypes";

/**
 * Priority order for sorting (lower number = higher priority)
 */
const priorityOrder: Record<Priority, number> = {
  [Priority.Urgent]: 1,
  [Priority.High]: 2,
  [Priority.Medium]: 3,
  [Priority.Low]: 4,
  [Priority.Backlog]: 5,
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
        else comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
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
