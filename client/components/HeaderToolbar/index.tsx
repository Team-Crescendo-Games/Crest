"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowUpDown, Filter, X, Search } from "lucide-react";
import {
  FilterState,
  DueDateOption,
  SortState,
  SortField,
} from "@/lib/filterTypes";
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
  accentColor?: string;
};

/**
 * Shared toolbar component for Board and Sprint headers.
 * Search input: @user filters by assignee, plain text filters tasks by title/description.
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

  // Local search input state
  const [searchInput, setSearchInput] = useState(filterState.searchText);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const searchDropdownRef = useRef<HTMLDivElement>(null);

  // Determine if user is typing @mention
  const isUserSearch = searchInput.startsWith("@");
  const userSearchTerm = isUserSearch ? searchInput.slice(1) : "";

  const { data: users = [] } = useGetUsersQuery();

  // Sync local input with filter state searchText (for external changes like clear all)
  useEffect(() => {
    if (!isUserSearch) {
      setSearchInput(filterState.searchText);
    }
  }, [filterState.searchText, isUserSearch]);

  // Close user dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchDropdownRef.current &&
        !searchDropdownRef.current.contains(event.target as Node)
      ) {
        setShowUserDropdown(false);
        setHighlightedIndex(0);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter users for @mention dropdown
  const filteredUsers = users
    .filter((user) => {
      if (!userSearchTerm) return true;
      return (
        user.username.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        (user.email?.toLowerCase().includes(userSearchTerm.toLowerCase()) ??
          false)
      );
    })
    .slice(0, 8);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredUsers.length]);

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setSearchInput(value);

    if (value.startsWith("@")) {
      // User search mode - show dropdown
      setShowUserDropdown(true);
    } else {
      // Task search mode - update filter directly
      setShowUserDropdown(false);
      onFilterChange({ ...filterState, searchText: value });
    }
  };

  // Add user to assignee filter
  const addUserFilter = (user: UserType) => {
    if (user.userId && !filterState.selectedAssigneeIds.includes(user.userId)) {
      onFilterChange({
        ...filterState,
        selectedAssigneeIds: [...filterState.selectedAssigneeIds, user.userId],
      });
    }
    setSearchInput("");
    setShowUserDropdown(false);
    setHighlightedIndex(0);
  };

  // Keyboard navigation for user dropdown
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showUserDropdown || !isUserSearch) return;

    const maxIndex = filteredUsers.length - 1;
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
      selectedAssigneeIds: filterState.selectedAssigneeIds.filter(
        (id) => id !== userId,
      ),
    });
  };

  const getUserById = (userId: number): UserType | undefined => {
    return users.find((u) => u.userId === userId);
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

  const clearSearchText = () => {
    setSearchInput("");
    onFilterChange({ ...filterState, searchText: "" });
  };

  return (
    <div className="flex items-center gap-2">
      {/* My Tasks toggle */}
      <label
        className={`flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-sm transition-colors ${
          showMyTasks
            ? "bg-yellow-100 dark:bg-yellow-900/30"
            : "dark:hover:bg-dark-tertiary text-gray-500 hover:bg-gray-100 dark:text-neutral-400"
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
            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-blue-600" />
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
            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-blue-600" />
          )}
        </button>
        {isSortDropdownOpen && (
          <div className="animate-dropdown dark:border-dark-tertiary dark:bg-dark-secondary absolute top-full right-0 z-20 mt-2 w-48 rounded-lg border border-gray-200 bg-white py-2 shadow-lg">
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
                className={`dark:hover:bg-dark-tertiary flex w-full items-center justify-between px-3 py-1.5 text-sm hover:bg-gray-100 ${
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
                <div className="dark:border-dark-tertiary my-1 border-t border-gray-200" />
                <button
                  onClick={() =>
                    onSortChange({ field: "none", direction: "asc" })
                  }
                  className="dark:hover:bg-dark-tertiary flex w-full items-center px-3 py-1.5 text-sm text-red-600 hover:bg-gray-100 dark:text-red-400"
                >
                  Clear sort
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Search input - @user for assignee, plain text for task filter */}
      <div className="relative" ref={searchDropdownRef}>
        <div className="relative">
          <Search className="absolute top-1/2 left-2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search or @user"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="dark:border-dark-tertiary dark:bg-dark-secondary w-36 rounded-md border border-gray-200 bg-white py-1 pr-7 pl-7 text-sm text-gray-700 placeholder-gray-400 focus:ring-1 focus:outline-none sm:w-44 dark:text-white dark:placeholder-gray-500"
            style={{
              borderColor: searchInput ? accentColor : undefined,
              boxShadow: searchInput ? `0 0 0 1px ${accentColor}` : undefined,
            }}
          />
          {searchInput && !isUserSearch && (
            <button
              onClick={clearSearchText}
              className="absolute top-1/2 right-2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {/* User dropdown - only for @mentions */}
        {showUserDropdown && isUserSearch && (
          <div className="animate-dropdown dark:border-dark-tertiary dark:bg-dark-secondary absolute top-full right-0 z-20 mt-1 max-h-48 w-56 overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
            <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-neutral-400">
              Filter by assignee
            </div>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user, index) => (
                <button
                  key={user.userId}
                  onClick={() => addUserFilter(user)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                    index === highlightedIndex
                      ? "dark:bg-dark-tertiary bg-gray-100"
                      : "dark:hover:bg-dark-tertiary hover:bg-gray-100"
                  }`}
                >
                  <span className="font-medium text-gray-900 dark:text-white">
                    @{user.username}
                  </span>
                  {user.email && (
                    <span className="truncate text-xs text-gray-500 dark:text-gray-400">
                      {user.email}
                    </span>
                  )}
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                No users found
              </div>
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
      </div>
    </div>
  );
};

export default HeaderToolbar;
