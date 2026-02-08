"use client";

import { useState, useRef, useEffect } from "react";
import { Archive, ArrowUpDown, Calendar, Copy, Filter, Settings, Table, X } from "lucide-react";
import { BiColumns } from "react-icons/bi";
import { MdTimeline } from "react-icons/md";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FilterState, DueDateOption, SortState, SortField } from "@/lib/filterTypes";
import { PRIORITY_COLORS } from "@/lib/priorityColors";
import { SPRINT_MAIN_COLOR } from "@/lib/entityColors";
import { Tag, Priority, useDuplicateSprintMutation, useArchiveSprintMutation, useGetUsersQuery, User } from "@/state/api";
import FilterDropdown from "@/components/FilterDropdown";
import ConfirmationMenu from "@/components/ConfirmationMenu";

type Props = {
  activeTab: "Board" | "Table" | "Timeline";
  setActiveTab: (tab: "Board" | "Table" | "Timeline") => void;
  sprintTitle: string;
  sprintStartDate?: string;
  sprintDueDate?: string;
  sprintId: number;
  isActive?: boolean;
  filterState: FilterState;
  onFilterChange: (state: FilterState) => void;
  tags: Tag[];
  isFilterActive: boolean;
  totalTasks: number;
  totalPoints: number;
  sortState: SortState;
  onSortChange: (newState: SortState) => void;
  isSortActive: boolean;
};

/**
 * SprintHeader component with filter support.
 * Displays sprint title, dates, view tabs, and filter controls.
 * Validates: Requirements 5.2, 5.3, 9.1, 9.3
 */
const SprintHeader = ({
  activeTab,
  setActiveTab,
  sprintTitle,
  sprintStartDate,
  sprintDueDate,
  sprintId,
  isActive = true,
  filterState,
  onFilterChange,
  tags,
  isFilterActive,
  totalTasks,
  totalPoints,
  sortState,
  onSortChange,
  isSortActive,
}: Props) => {
  const router = useRouter();
  // State for filter dropdown visibility
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [includeFinishedTasks, setIncludeFinishedTasks] = useState(false);
  const [duplicateSprint, { isLoading: isDuplicating }] = useDuplicateSprintMutation();
  const [archiveSprint, { isLoading: isArchiving }] = useArchiveSprintMutation();

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

  // Filter users based on search (remove @ prefix for matching)
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
  const addUserFilter = (user: User) => {
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
  const getUserById = (userId: number): User | undefined => {
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

  // Remove a tag filter
  const removeTagFilter = (tagId: number) => {
    onFilterChange({
      ...filterState,
      selectedTagIds: filterState.selectedTagIds.filter((id) => id !== tagId),
    });
  };

  // Remove a priority filter
  const removePriorityFilter = (priority: Priority) => {
    onFilterChange({
      ...filterState,
      selectedPriorities: filterState.selectedPriorities.filter((p) => p !== priority),
    });
  };

  // Remove a due date filter
  const removeDueDateFilter = (option: DueDateOption) => {
    onFilterChange({
      ...filterState,
      selectedDueDateOptions: filterState.selectedDueDateOptions.filter((o) => o !== option),
    });
  };

  const handleDuplicate = async () => {
    try {
      const newSprint = await duplicateSprint({ sprintId, includeFinishedTasks }).unwrap();
      setShowDuplicateConfirm(false);
      setIncludeFinishedTasks(false); // Reset for next time
      router.push(`/sprints/${newSprint.id}`);
    } catch (error) {
      console.error("Failed to duplicate sprint:", error);
    }
  };

  const handleArchive = async () => {
    try {
      await archiveSprint(sprintId).unwrap();
      setShowArchiveConfirm(false);
    } catch (error) {
      console.error("Failed to archive sprint:", error);
    }
  };

  /**
   * Format date string to a readable format
   * @param dateString - ISO date string
   * @returns Formatted date string (e.g., "Jan 15, 2024")
   */
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="px-4 xl:px-6">
      {/* Inactive Sprint Banner */}
      {!isActive && (
        <div className="mt-4 rounded-lg bg-orange-100 px-4 py-2 text-sm text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
          This sprint is inactive
        </div>
      )}
      
      {/* Sprint Title and Dates - Validates: Requirement 5.2 */}
      <div className="pb-6 pt-6 lg:pb-4 lg:pt-8">
        <div className="flex flex-col gap-2">
          <h1 className="flex items-center gap-3 text-2xl font-bold text-gray-800 dark:text-white">
            {sprintTitle}
            <span className="inline-block rounded-full bg-gray-200 px-2 py-1 text-sm font-medium text-gray-700 dark:bg-dark-tertiary dark:text-white">
              {totalTasks} tasks · {totalPoints} pts
            </span>
            <button
              onClick={() => setShowDuplicateConfirm(true)}
              disabled={isDuplicating}
              className="text-gray-500 hover:text-gray-700 dark:text-neutral-400 dark:hover:text-neutral-200 disabled:opacity-50"
              aria-label="Duplicate sprint"
              title="Duplicate sprint"
            >
              <Copy className="h-5 w-5" />
            </button>
            <ConfirmationMenu
              isOpen={showDuplicateConfirm}
              onClose={() => {
                setShowDuplicateConfirm(false);
                setIncludeFinishedTasks(false);
              }}
              onConfirm={handleDuplicate}
              title="Duplicate Sprint"
              message={`Create a copy of "${sprintTitle}"?`}
              confirmLabel="Duplicate"
              isLoading={isDuplicating}
              variant="info"
            >
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={includeFinishedTasks}
                  onChange={(e) => setIncludeFinishedTasks(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 accent-blue-600 dark:border-neutral-600"
                />
                Migrate finished tasks?
              </label>
            </ConfirmationMenu>
            <button
              onClick={() => setShowArchiveConfirm(true)}
              disabled={isArchiving}
              className="text-gray-500 hover:text-gray-700 dark:text-neutral-400 dark:hover:text-neutral-200 disabled:opacity-50"
              aria-label={isActive ? "Archive sprint" : "Unarchive sprint"}
              title={isActive ? "Archive sprint" : "Unarchive sprint"}
            >
              <Archive className="h-5 w-5" />
            </button>
            <ConfirmationMenu
              isOpen={showArchiveConfirm}
              onClose={() => setShowArchiveConfirm(false)}
              onConfirm={handleArchive}
              title={isActive ? "Archive Sprint" : "Unarchive Sprint"}
              message={isActive 
                ? `Archive "${sprintTitle}"? It will be hidden from the sidebar by default.`
                : `Unarchive "${sprintTitle}"? It will be visible in the sidebar again.`
              }
              confirmLabel={isActive ? "Archive" : "Unarchive"}
              isLoading={isArchiving}
              variant="warning"
            />
            <Link
              href={`/sprints/${sprintId}/settings`}
              className="text-gray-500 hover:text-gray-700 dark:text-neutral-400 dark:hover:text-neutral-200"
              aria-label="Settings"
            >
              <Settings className="h-5 w-5" />
            </Link>
          </h1>
          {/* Date display with calendar icon */}
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            {sprintStartDate && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>Start: {formatDate(sprintStartDate)}</span>
              </div>
            )}
            {sprintDueDate && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>Due: {formatDate(sprintDueDate)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TABS - Validates: Requirement 5.3 */}
      <div className="flex flex-wrap gap-2 border-y border-gray-200 pb-[8px] pt-2 dark:border-stroke-dark">
        <div className="flex flex-1 items-end self-end gap-2 md:gap-4">
          <TabButton
            name="Board"
            icon={<BiColumns className="h-5 w-5" />}
            setActiveTab={setActiveTab}
            activeTab={activeTab}
          />
          <TabButton
            name="Table"
            icon={<Table className="h-5 w-5" />}
            setActiveTab={setActiveTab}
            activeTab={activeTab}
          />
          <TabButton
            name="Timeline"
            icon={<MdTimeline className="h-5 w-5" />}
            setActiveTab={setActiveTab}
            activeTab={activeTab}
          />
        </div>
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
              className="w-24 rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-700 placeholder-gray-400 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400 dark:border-dark-tertiary dark:bg-dark-secondary dark:text-white dark:placeholder-gray-500"
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
            {filterState.selectedPriorities.map((priority) => {
              return (
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
              );
            })}
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
                        // Toggle direction or clear
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

          {/* Filter button with dropdown - Validates: Requirements 9.1, 9.3 */}
          <div className="relative">
            <button
              className="relative text-gray-500 hover:text-gray-600 dark:text-neutral-500 dark:hover:text-gray-300"
              onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
              aria-label="Toggle filter dropdown"
              aria-expanded={isFilterDropdownOpen}
            >
              <Filter className="h-5 w-5" />
              {/* Visual indicator when filters are active - Validates: Requirement 9.3 */}
              {isFilterActive && (
                <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-blue-600" />
              )}
            </button>
            {/* Filter dropdown - Validates: Requirement 9.1 */}
            <FilterDropdown
              isOpen={isFilterDropdownOpen}
              onClose={() => setIsFilterDropdownOpen(false)}
              filterState={filterState}
              onFilterChange={onFilterChange}
              tags={tags}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

type TabButtonProps = {
  name: "Board" | "Table" | "Timeline";
  icon: React.ReactNode;
  setActiveTab: (tabName: "Board" | "Table" | "Timeline") => void;
  activeTab: string;
};

/**
 * TabButton component for switching between Board and Table views.
 * Validates: Requirement 5.3
 */
const TabButton = ({ name, icon, setActiveTab, activeTab }: TabButtonProps) => {
  const isActive = activeTab === name;

  return (
    <button
      className={`relative flex items-center gap-2 px-1 py-2 
      after:absolute after:-bottom-2.25 after:left-0 after:h-px after:w-full 
      sm:px-2 lg:px-4 ${
        isActive 
          ? "" 
          : "text-gray-500 hover:text-purple-500 dark:text-neutral-500 dark:hover:text-purple-400"
      }`}
      style={isActive ? { color: SPRINT_MAIN_COLOR } : undefined}
      onClick={() => setActiveTab(name)}
    >
      {isActive && (
        <span 
          className="absolute -bottom-2.25 left-0 h-px w-full" 
          style={{ backgroundColor: SPRINT_MAIN_COLOR }}
        />
      )}
      {icon}
      {name}
    </button>
  );
};

export default SprintHeader;
