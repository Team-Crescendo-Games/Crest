"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowUpDown, Filter, User, X } from "lucide-react";
import { FilterState, DueDateOption, SortState, SortField } from "@/lib/filterTypes";
import { PRIORITY_COLORS } from "@/lib/priorityColors";
import { APP_ACCENT_LIGHT, APP_ACCENT_DARK } from "@/lib/entityColors";
import { Tag, Priority, useGetUsersQuery, User as UserType } from "@/state/api";
import FilterDropdown from "@/components/FilterDropdown";
import { useAppSelector } from "@/app/redux";

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
  /** Accent color for the user search input focus ring */
  accentColor?: string;
};

/**
 * Shared toolbar component for Board and Sprint headers.
 * Contains: My Tasks toggle, user search, filter pills, sort dropdown, filter dropdown.
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
  accentColor = "#3b82f6",
}: HeaderToolbarProps) => {
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);

  // User filter state
  const [userSearch, setUserSearch] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const userInputRef = useRef<HTMLInputElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const { data: users = [] } = useGetUsersQuery();

  // Close user dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
        setHighlightedIndex(0);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter users based on search
  const filteredUsers = users.filter((user) => {
    const searchTerm = userSearch.startsWith("@") ? userSearch.slice(1) : userSearch;
    if (!searchTerm) return true;
    return (
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
    );
  });

  // Reset highlighted index when filtered users change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredUsers.length]);

  // Add user to filter
  const addUserFilter = (user: UserType) => {
    if (user.userId && !filterState.selectedAssigneeIds.includes(user.userId)) {
      onFilterChange({
        ...filterState,
        selectedAssigneeIds: [...filterState.selectedAssigneeIds, user.userId],
      });
    }
    setUserSearch("");
    setShowUserDropdown(false);
    setHighlightedIndex(0);
  };

  // Handle keyboard navigation
  const handleUserInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showUserDropdown) {
      if (e.key === "ArrowDown" || e.key === "@") {
        setShowUserDropdown(true);
      }
      return;
    }

    const maxIndex = Math.min(filteredUsers.length, 8) - 1;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < maxIndex ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : maxIndex));
        break;
      case "Enter":
        e.preventDefault();
        if (filteredUsers[highlightedIndex]) {
          addUserFilter(filteredUsers[highlightedIndex]);
        }
        break;
      case "Escape":
        setShowUserDropdown(false);
        setHighlightedIndex(0);
        break;
    }
  };

  // Remove user from filter
  const removeUserFilter = (userId: number) => {
    onFilterChange({
      ...filterState,
      selectedAssigneeIds: filterState.selectedAssigneeIds.filter((id) => id !== userId),
    });
  };

  // Get user by ID for display
  const getUserById = (userId: number): UserType | undefined => {
    return users.find((u) => u.userId === userId);
  };

  // Sort field labels
  const sortFieldLabels: Record<SortField, string> = {
    none: "None",
    dueDate: "Due Date",
    priority: "Priority",
    points: "Points",
  };

  // Due date option labels
  const dueDateLabels: Record<DueDateOption, string> = {
    overdue: "Overdue",
    dueToday: "Due Today",
    dueThisWeek: "Due This Week",
    dueThisMonth: "Due This Month",
    noDueDate: "No Due Date",
  };

  // Remove filters
  const removeTagFilter = (tagId: number) => {
    onFilterChange({
      ...filterState,
      selectedTagIds: filterState.selectedTagIds.filter((id) => id !== tagId),
    });
  };

  const removePriorityFilter = (priority: Priority) => {
    onFilterChange({
      ...filterState,
      selectedPriorities: filterState.selectedPriorities.filter((p) => p !== priority),
    });
  };

  const removeDueDateFilter = (option: DueDateOption) => {
    onFilterChange({
      ...filterState,
      selectedDueDateOptions: filterState.selectedDueDateOptions.filter((o) => o !== option),
    });
  };

  return (
    <div className="flex items-center gap-2">
      {/* User filter input with @mention */}
      <div className="relative" ref={userDropdownRef}>
        <input
          ref={userInputRef}
          type="text"
          placeholder="@user"
          value={userSearch}
          onChange={(e) => {
            setUserSearch(e.target.value);
            setShowUserDropdown(e.target.value.length > 0);
          }}
          onFocus={() => {
            if (userSearch.length > 0) setShowUserDropdown(true);
          }}
          onKeyDown={handleUserInputKeyDown}
          className="w-24 rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 dark:border-dark-tertiary dark:bg-dark-secondary dark:text-white dark:placeholder-gray-500"
          style={{ 
            borderColor: userSearch ? accentColor : undefined,
            boxShadow: userSearch ? `0 0 0 1px ${accentColor}` : undefined 
          }}
        />
        {showUserDropdown && (
          <div className="absolute left-0 top-full z-20 mt-1 max-h-48 w-56 overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-dark-tertiary dark:bg-dark-secondary">
            {filteredUsers.length > 0 ? (
              filteredUsers.slice(0, 8).map((user, index) => (
                <button
                  key={user.userId}
                  onClick={() => addUserFilter(user)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                    index === highlightedIndex
                      ? "bg-gray-100 dark:bg-dark-tertiary"
                      : "hover:bg-gray-100 dark:hover:bg-dark-tertiary"
                  }`}
                >
                  <span className="font-medium text-gray-900 dark:text-white">@{user.username}</span>
                  {user.email && (
                    <span className="truncate text-xs text-gray-500 dark:text-gray-400">{user.email}</span>
                  )}
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No users found</div>
            )}
          </div>
        )}
      </div>

      {/* Active filter pills */}
      <div className="flex flex-wrap items-center gap-1.5 max-w-xs">
        {/* User filter pills */}
        {filterState.selectedAssigneeIds.map((userId) => {
          const user = getUserById(userId);
          if (!user) return null;
          return (
            <span
              key={`user-${userId}`}
              className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-medium text-white"
            >
              @{user.username}
              <button
                onClick={() => removeUserFilter(userId)}
                className="ml-0.5 hover:opacity-70"
                aria-label={`Remove ${user.username} filter`}
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
              style={{ backgroundColor: tag.color || '#3b82f6' }}
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
      </div>

      {/* Show My Tasks toggle */}
      <button
        onClick={() => onShowMyTasksChange(!showMyTasks)}
        className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-sm transition-colors ${
          showMyTasks
            ? "bg-yellow-100 dark:bg-yellow-900/30"
            : "text-gray-500 hover:bg-gray-100 dark:text-neutral-400 dark:hover:bg-dark-tertiary"
        }`}
        style={showMyTasks ? { color: isDarkMode ? APP_ACCENT_LIGHT : APP_ACCENT_DARK } : undefined}
        title="Highlight my tasks"
      >
        <User size={14} />
        <span className="hidden sm:inline">My Tasks</span>
      </button>

      {/* Sort button with dropdown */}
      <div className="relative">
        <button
          className="relative text-gray-500 hover:text-gray-600 dark:text-neutral-500 dark:hover:text-gray-300"
          onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
          aria-label="Toggle sort dropdown"
          aria-expanded={isSortDropdownOpen}
        >
          <ArrowUpDown className="h-5 w-5" />
          {isSortActive && (
            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-blue-600" />
          )}
        </button>
        {isSortDropdownOpen && (
          <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-lg border border-gray-200 bg-white py-2 shadow-lg dark:border-dark-tertiary dark:bg-dark-secondary">
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
                  sortState.field === field ? "text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-200"
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
                  onClick={() => onSortChange({ field: "none", direction: "asc" })}
                  className="flex w-full items-center px-3 py-1.5 text-sm text-red-600 hover:bg-gray-100 dark:text-red-400 dark:hover:bg-dark-tertiary"
                >
                  Clear sort
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Filter button with dropdown */}
      <div className="relative">
        <button
          className="relative text-gray-500 hover:text-gray-600 dark:text-neutral-500 dark:hover:text-gray-300"
          onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
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
        />
      </div>
    </div>
  );
};

export default HeaderToolbar;
