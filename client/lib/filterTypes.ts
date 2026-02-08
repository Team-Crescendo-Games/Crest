import { Priority } from "@/state/api";

/**
 * Type representing due date filter options.
 * Used to filter tasks based on their due date relative to today.
 */
export type DueDateOption =
  | "overdue"
  | "dueToday"
  | "dueThisWeek"
  | "dueThisMonth"
  | "noDueDate";

/**
 * Type representing sort field options.
 */
export type SortField = "dueDate" | "priority" | "points" | "none";

/**
 * Type representing sort direction.
 */
export type SortDirection = "asc" | "desc";

/**
 * Interface representing the current sort state.
 */
export interface SortState {
  field: SortField;
  direction: SortDirection;
}

/**
 * Initial sort state - sort by due date ascending by default.
 */
export const initialSortState: SortState = {
  field: "dueDate",
  direction: "asc",
};

/**
 * Interface representing the current state of all active filters.
 * Used to track user selections across tag, priority, due date, and assignee filters.
 */
export interface FilterState {
  /** Array of selected tag IDs for filtering tasks by labels */
  selectedTagIds: number[];
  /** Array of selected priority values for filtering tasks by urgency */
  selectedPriorities: Priority[];
  /** Array of selected due date options for filtering tasks by deadline */
  selectedDueDateOptions: DueDateOption[];
  /** Array of selected user IDs for filtering tasks by assignee */
  selectedAssigneeIds: number[];
}

/**
 * Initial filter state with no active filters.
 * All tasks will pass through when this state is applied.
 */
export const initialFilterState: FilterState = {
  selectedTagIds: [],
  selectedPriorities: [],
  selectedDueDateOptions: [],
  selectedAssigneeIds: [],
};
