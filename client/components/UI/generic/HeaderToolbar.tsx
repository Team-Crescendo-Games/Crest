"use client";

import { useState, useRef } from "react";
import { ArrowUpDown, Filter, X, Calendar } from "lucide-react";
import { format } from "date-fns";
import {
  FilterState,
  DueDateOption,
  TaskStatus,
  SortState,
  SortField,
} from "@/lib/filterTypes";
import { PRIORITY_COLORS } from "@/lib/priorityColors";
import { STATUS_BADGE_STYLES } from "@/lib/statusColors";
import {
  APP_ACCENT_LIGHT,
  APP_ACCENT_DARK,
  BOARD_MAIN_COLOR,
} from "@/lib/entityColors";
import {
  Tag,
  Priority,
  useGetWorkspaceMembersQuery,
  useGetBoardsQuery,
} from "@/state/api";
import FilterDropdown from "@/components/UI/generic/FilterDropdown";
import DatePicker from "@/components/DatePicker";
import { useAppSelector } from "@/app/redux";
import { parseLocalDate } from "@/lib/dateUtils";
import { useWorkspace } from "@/lib/useWorkspace";

type HeaderToolbarProps = {
  filterState: FilterState;
  onFilterChange: (newState: FilterState) => void;
  tags: Tag[];
  isFilterActive: boolean;
  sortState: SortState;
  onSortChange: (newState: SortState) => void;
  isSortActive: boolean;
  showMyTasks: boolean;
  onShowMyTasksChange: (show: boolean) => void;
  hideMyTasks?: boolean;
};

/**
 * Shared toolbar component for Board and Sprint headers.
 * Filter pills, sort, and filter dropdown.
 */
const HeaderToolbar = ({
  filterState,
  onFilterChange,
  tags,
  isFilterActive,
  sortState,
  onSortChange,
  isSortActive,
  showMyTasks,
  onShowMyTasksChange,
  hideMyTasks = false,
}: HeaderToolbarProps) => {
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);
  const { activeWorkspaceId } = useWorkspace(); // ADDED

  const startDateRef = useRef<HTMLDivElement>(null);
  const endDateRef = useRef<HTMLDivElement>(null);

  // SCOPED FETCHING
  const { data: members = [] } = useGetWorkspaceMembersQuery(
    activeWorkspaceId!,
    { skip: !activeWorkspaceId },
  );
  const { data: boards = [] } = useGetBoardsQuery(activeWorkspaceId!, {
    skip: !activeWorkspaceId,
  });

  const removeUserFilter = (userId: number) => {
    onFilterChange({
      ...filterState,
      selectedAssigneeIds: filterState.selectedAssigneeIds.filter(
        (id) => id !== userId,
      ),
    });
  };

  // Helper updated to search through Workspace Members instead of raw Users
  const getUserById = (userId: number) => {
    const member = members.find((m) => m.userId === userId);
    return member?.user;
  };

  const sortFieldLabels: Record<SortField, string> = {
    none: "None",
    dueDate: "Due Date",
    priority: "Priority",
    points: "Points",
  };

  const dueDateLabels: Record<DueDateOption, string> = {
    overdue: "Overdue",
    dueToday: "Due Today",
    dueThisWeek: "Due This Week",
    dueThisMonth: "Due This Month",
    noDueDate: "No Due Date",
  };

  const removeTagFilter = (tagId: number) => {
    onFilterChange({
      ...filterState,
      selectedTagIds: filterState.selectedTagIds.filter((id) => id !== tagId),
    });
  };

  const removePriorityFilter = (priority: Priority) => {
    onFilterChange({
      ...filterState,
      selectedPriorities: filterState.selectedPriorities.filter(
        (p) => p !== priority,
      ),
    });
  };

  const removeDueDateFilter = (option: DueDateOption) => {
    onFilterChange({
      ...filterState,
      selectedDueDateOptions: filterState.selectedDueDateOptions.filter(
        (o) => o !== option,
      ),
    });
  };

  const removeStatusFilter = (status: TaskStatus) => {
    onFilterChange({
      ...filterState,
      selectedStatuses: filterState.selectedStatuses.filter(
        (s) => s !== status,
      ),
    });
  };

  const removeBoardFilter = (boardId: number) => {
    onFilterChange({
      ...filterState,
      selectedBoardIds: filterState.selectedBoardIds.filter(
        // Ensure your FilterState interface supports selectedBoardIds!
        (id) => id !== boardId,
      ),
    });
  };

  // Time range handlers
  const handleStartDateChange = (date: string | undefined) => {
    onFilterChange({
      ...filterState,
      timeRange: {
        startDate: date || null,
        endDate: filterState.timeRange?.endDate || null,
      },
    });
  };

  const handleEndDateChange = (date: string | undefined) => {
    onFilterChange({
      ...filterState,
      timeRange: {
        startDate: filterState.timeRange?.startDate || null,
        endDate: date || null,
      },
    });
  };

  const clearTimeRange = () => {
    onFilterChange({
      ...filterState,
      timeRange: undefined,
    });
  };

  const hasTimeRange =
    filterState.timeRange?.startDate || filterState.timeRange?.endDate;

  const formatDateDisplay = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    return format(parseLocalDate(dateStr), "MMM d");
  };

  return (
    <div className="flex items-center gap-2">
      {/* My Tasks toggle */}
      {!hideMyTasks && (
        <label
          className={`flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-sm transition-colors ${
            showMyTasks
              ? "bg-yellow-100 dark:bg-yellow-900/30"
              : "text-gray-500 hover:bg-gray-100 dark:text-neutral-400 dark:hover:bg-dark-tertiary"
          }`}
          style={
            showMyTasks
              ? { color: isDarkMode ? APP_ACCENT_LIGHT : APP_ACCENT_DARK }
              : undefined
          }
          title="Highlight my tasks"
        >
          <input
            type="checkbox"
            checked={showMyTasks}
            onChange={(e) => onShowMyTasksChange(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-gray-300 accent-yellow-500 dark:border-neutral-600"
          />
          <span className="hidden sm:inline">My Tasks</span>
        </label>
      )}

      {/* Time Range Selector */}
      {hideMyTasks && (
        <div className="flex items-center gap-1">
          {/* Start Date */}
          <div className="relative" ref={startDateRef}>
            <button
              onClick={() => {
                setShowStartDatePicker(!showStartDatePicker);
                setShowEndDatePicker(false);
              }}
              className={`flex items-center gap-1 rounded-md border px-2 py-1 text-sm transition-colors ${
                filterState.timeRange?.startDate
                  ? "border-blue-400 bg-blue-50 text-blue-700 dark:border-blue-600 dark:bg-blue-900/30 dark:text-blue-300"
                  : "border-gray-200 text-gray-500 hover:bg-gray-100 dark:border-dark-tertiary dark:text-neutral-400 dark:hover:bg-dark-tertiary"
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {filterState.timeRange?.startDate
                  ? formatDateDisplay(filterState.timeRange.startDate)
                  : "From"}
              </span>
            </button>
            {showStartDatePicker && (
              <div className="absolute left-0 top-full z-30 mt-1">
                <DatePicker
                  value={filterState.timeRange?.startDate || undefined}
                  onChange={handleStartDateChange}
                  onClose={() => setShowStartDatePicker(false)}
                />
              </div>
            )}
          </div>

          <span className="text-gray-400 dark:text-gray-500">–</span>

          {/* End Date */}
          <div className="relative" ref={endDateRef}>
            <button
              onClick={() => {
                setShowEndDatePicker(!showEndDatePicker);
                setShowStartDatePicker(false);
              }}
              className={`flex items-center gap-1 rounded-md border px-2 py-1 text-sm transition-colors ${
                filterState.timeRange?.endDate
                  ? "border-blue-400 bg-blue-50 text-blue-700 dark:border-blue-600 dark:bg-blue-900/30 dark:text-blue-300"
                  : "border-gray-200 text-gray-500 hover:bg-gray-100 dark:border-dark-tertiary dark:text-neutral-400 dark:hover:bg-dark-tertiary"
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {filterState.timeRange?.endDate
                  ? formatDateDisplay(filterState.timeRange.endDate)
                  : "To"}
              </span>
            </button>
            {showEndDatePicker && (
              <div className="absolute left-0 top-full z-30 mt-1">
                <DatePicker
                  value={filterState.timeRange?.endDate || undefined}
                  onChange={handleEndDateChange}
                  onClose={() => setShowEndDatePicker(false)}
                  minDate={filterState.timeRange?.startDate || undefined}
                />
              </div>
            )}
          </div>

          {/* Clear time range */}
          {hasTimeRange && (
            <button
              onClick={clearTimeRange}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-dark-tertiary"
              title="Clear time range"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Filter button */}
      <div className="relative">
        <button
          className="relative text-gray-500 hover:text-gray-600 dark:text-neutral-500 dark:hover:text-gray-300"
          onClick={() => {
            setIsFilterDropdownOpen(!isFilterDropdownOpen);
            setIsSortDropdownOpen(false);
          }}
          aria-label="Toggle filter dropdown"
          aria-expanded={isFilterDropdownOpen}
        >
          <Filter className="h-5 w-5" />
          {isFilterActive && (
            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-blue-600" />
          )}
        </button>
        <FilterDropdown
          isOpen={isFilterDropdownOpen}
          onClose={() => setIsFilterDropdownOpen(false)}
          filterState={filterState}
          onFilterChange={onFilterChange}
          tags={tags}
          boards={boards}
        />
      </div>

      {/* Sort button */}
      <div className="relative">
        <button
          className="relative text-gray-500 hover:text-gray-600 dark:text-neutral-500 dark:hover:text-gray-300"
          onClick={() => {
            setIsSortDropdownOpen(!isSortDropdownOpen);
            setIsFilterDropdownOpen(false);
          }}
          aria-label="Toggle sort dropdown"
          aria-expanded={isSortDropdownOpen}
        >
          <ArrowUpDown className="h-5 w-5" />
          {isSortActive && (
            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-blue-600" />
          )}
        </button>
        {isSortDropdownOpen && (
          <div className="animate-dropdown absolute right-0 top-full z-20 mt-2 w-48 rounded-lg border border-gray-200 bg-white py-2 shadow-lg dark:border-dark-tertiary dark:bg-dark-secondary">
            <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-neutral-400">
              Sort by
            </div>
            {(["dueDate", "priority", "points"] as SortField[]).map((field) => (
              <button
                key={field}
                onClick={() => {
                  if (sortState.field === field) {
                    if (sortState.direction === "asc") {
                      onSortChange({ field, direction: "desc" });
                    } else {
                      onSortChange({ field: "none", direction: "asc" });
                    }
                  } else {
                    onSortChange({ field, direction: "asc" });
                  }
                }}
                className={`flex w-full items-center justify-between px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-dark-tertiary ${
                  sortState.field === field
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-700 dark:text-gray-200"
                }`}
              >
                <span>{sortFieldLabels[field]}</span>
                {sortState.field === field && (
                  <span className="text-xs">
                    {sortState.direction === "asc" ? "↑" : "↓"}
                  </span>
                )}
              </button>
            ))}
            {isSortActive && (
              <>
                <div className="my-1 border-t border-gray-200 dark:border-dark-tertiary" />
                <button
                  onClick={() =>
                    onSortChange({ field: "none", direction: "asc" })
                  }
                  className="flex w-full items-center px-3 py-1.5 text-sm text-red-600 hover:bg-gray-100 dark:text-red-400 dark:hover:bg-dark-tertiary"
                >
                  Clear sort
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Active filter pills */}
      <div className="flex max-w-xs flex-wrap items-center gap-1.5">
        {filterState.selectedAssigneeIds.map((userId) => {
          const user = getUserById(userId);
          if (!user) return null;
          return (
            <span
              key={`user-${userId}`}
              className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-medium text-white"
            >
              {user.fullName || user.username}
              <button
                onClick={() => removeUserFilter(userId)}
                className="ml-0.5 hover:opacity-70"
                aria-label={`Remove ${user.fullName || user.username} filter`}
              >
                <X size={12} />
              </button>
            </span>
          );
        })}
        {filterState.selectedTagIds.map((tagId) => {
          const tag = tags.find((t) => t.id === tagId);
          if (!tag) return null;
          return (
            <span
              key={`tag-${tagId}`}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-white"
              style={{ backgroundColor: tag.color || "#3b82f6" }}
            >
              {tag.name}
              <button
                onClick={() => removeTagFilter(tagId)}
                className="ml-0.5 hover:opacity-70"
                aria-label={`Remove ${tag.name} filter`}
              >
                <X size={12} />
              </button>
            </span>
          );
        })}
        {filterState.selectedPriorities.map((priority) => (
          <span
            key={`priority-${priority}`}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-white"
            style={{ backgroundColor: PRIORITY_COLORS[priority] }}
          >
            {priority}
            <button
              onClick={() => removePriorityFilter(priority)}
              className="ml-0.5 hover:opacity-70"
              aria-label={`Remove ${priority} filter`}
            >
              <X size={12} />
            </button>
          </span>
        ))}
        {filterState.selectedDueDateOptions.map((option) => (
          <span
            key={`duedate-${option}`}
            className="inline-flex items-center gap-1 rounded-full bg-gray-600 px-2.5 py-1 text-xs font-medium text-white"
          >
            {dueDateLabels[option]}
            <button
              onClick={() => removeDueDateFilter(option)}
              className="ml-0.5 hover:opacity-70"
              aria-label={`Remove ${dueDateLabels[option]} filter`}
            >
              <X size={12} />
            </button>
          </span>
        ))}
        {filterState.selectedStatuses.map((status) => {
          const colors =
            STATUS_BADGE_STYLES[status] || STATUS_BADGE_STYLES["Input Queue"];
          return (
            <span
              key={`status-${status}`}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${colors.bg} ${colors.text} ${colors.darkBg} ${colors.darkText}`}
            >
              {status}
              <button
                onClick={() => removeStatusFilter(status)}
                className="ml-0.5 hover:opacity-70"
                aria-label={`Remove ${status} filter`}
              >
                <X size={12} />
              </button>
            </span>
          );
        })}
        {filterState.selectedBoardIds?.map((boardId) => {
          const board = boards.find((b) => b.id === boardId);
          if (!board) return null;
          return (
            <span
              key={`board-${boardId}`}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-white"
              style={{ backgroundColor: BOARD_MAIN_COLOR }}
            >
              {board.name}
              <button
                onClick={() => removeBoardFilter(boardId)}
                className="ml-0.5 hover:opacity-70"
                aria-label={`Remove ${board.name} filter`}
              >
                <X size={12} />
              </button>
            </span>
          );
        })}
      </div>
    </div>
  );
};

export default HeaderToolbar;
