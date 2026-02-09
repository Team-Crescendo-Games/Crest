"use client";

import { useRef, useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { FilterState, DueDateOption, initialFilterState } from "@/lib/filterTypes";
import { isFilterActive } from "@/lib/filterUtils";
import { Tag, Priority } from "@/state/api";

interface FilterDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  filterState: FilterState;
  onFilterChange: (newState: FilterState) => void;
  tags: Tag[];
}

const FilterDropdown = ({
  isOpen,
  onClose,
  filterState,
  onFilterChange,
  tags,
}: FilterDropdownProps) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // State for collapsible sections
  const [isLabelsExpanded, setIsLabelsExpanded] = useState(false);
  const [isPriorityExpanded, setIsPriorityExpanded] = useState(false);
  const [isDueDateExpanded, setIsDueDateExpanded] = useState(false);

  const priorityOptions: Priority[] = [
    Priority.Urgent,
    Priority.High,
    Priority.Medium,
    Priority.Low,
    Priority.Backlog,
  ];

  const dueDateOptions: DueDateOption[] = [
    "overdue",
    "dueToday",
    "dueThisWeek",
    "dueThisMonth",
    "noDueDate",
  ];

  // Mapping from DueDateOption values to display labels
  const dueDateOptionLabels: Record<DueDateOption, string> = {
    overdue: "Overdue",
    dueToday: "Due Today",
    dueThisWeek: "Due This Week",
    dueThisMonth: "Due This Month",
    noDueDate: "No Due Date",
  };

  // Click-outside detection to close dropdown
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    // Add listener on next tick to avoid immediate close from the opening click
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Handle Escape key to close dropdown
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Don't render if not open
  if (!isOpen) return null;

  const handleTagToggle = (tagId: number, checked: boolean) => {
    const newSelectedTagIds = checked
      ? [...filterState.selectedTagIds, tagId]
      : filterState.selectedTagIds.filter((id) => id !== tagId);

    onFilterChange({
      ...filterState,
      selectedTagIds: newSelectedTagIds,
    });
  };

  const handlePriorityToggle = (priority: Priority, checked: boolean) => {
    const newSelectedPriorities = checked
      ? [...filterState.selectedPriorities, priority]
      : filterState.selectedPriorities.filter((p) => p !== priority);

    onFilterChange({
      ...filterState,
      selectedPriorities: newSelectedPriorities,
    });
  };

  const handleDueDateToggle = (option: DueDateOption, checked: boolean) => {
    const newSelectedDueDateOptions = checked
      ? [...filterState.selectedDueDateOptions, option]
      : filterState.selectedDueDateOptions.filter((o) => o !== option);

    onFilterChange({
      ...filterState,
      selectedDueDateOptions: newSelectedDueDateOptions,
    });
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border border-gray-200 bg-white shadow-lg transition-all duration-150 ease-out dark:border-dark-tertiary dark:bg-dark-secondary animate-dropdown"
      role="dialog"
      aria-label="Filter options"
    >
      {/* Header */}
      <div className="border-b border-gray-200 px-4 py-3 dark:border-dark-tertiary">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Filters
        </h3>
      </div>

      {/* Filter Sections Container */}
      <div className="max-h-80 overflow-y-auto">
        {/* Labels Section */}
        <div className="border-b border-gray-100 px-4 py-3 dark:border-dark-tertiary">
          <button
            type="button"
            onClick={() => setIsLabelsExpanded(!isLabelsExpanded)}
            className="flex w-full items-center justify-between text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            aria-expanded={isLabelsExpanded}
          >
            <span>Labels</span>
            {isLabelsExpanded ? (
              <ChevronUp size={16} />
            ) : (
              <ChevronDown size={16} />
            )}
          </button>
          
          {isLabelsExpanded && (
            <div className="mt-2 space-y-2">
              {tags.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No tags available
                </p>
              ) : (
                tags.map((tag) => (
                  <label
                    key={tag.id}
                    className="flex cursor-pointer items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  >
                    <input
                      type="checkbox"
                      checked={filterState.selectedTagIds.includes(tag.id)}
                      onChange={(e) => handleTagToggle(tag.id, e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-dark-tertiary dark:bg-dark-tertiary"
                    />
                    <span className="truncate">{tag.name}</span>
                  </label>
                ))
              )}
            </div>
          )}
        </div>

        {/* Priority Section */}
        <div className="border-b border-gray-100 px-4 py-3 dark:border-dark-tertiary">
          <button
            type="button"
            onClick={() => setIsPriorityExpanded(!isPriorityExpanded)}
            className="flex w-full items-center justify-between text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            aria-expanded={isPriorityExpanded}
          >
            <span>Priority</span>
            {isPriorityExpanded ? (
              <ChevronUp size={16} />
            ) : (
              <ChevronDown size={16} />
            )}
          </button>
          
          {isPriorityExpanded && (
            <div className="mt-2 space-y-2">
              {priorityOptions.map((priority) => (
                <label
                  key={priority}
                  className="flex cursor-pointer items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  <input
                    type="checkbox"
                    checked={filterState.selectedPriorities.includes(priority)}
                    onChange={(e) => handlePriorityToggle(priority, e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-dark-tertiary dark:bg-dark-tertiary"
                  />
                  <span>{priority}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Due Date Section */}
        <div className="px-4 py-3">
          <button
            type="button"
            onClick={() => setIsDueDateExpanded(!isDueDateExpanded)}
            className="flex w-full items-center justify-between text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            aria-expanded={isDueDateExpanded}
          >
            <span>Due Date</span>
            {isDueDateExpanded ? (
              <ChevronUp size={16} />
            ) : (
              <ChevronDown size={16} />
            )}
          </button>
          
          {isDueDateExpanded && (
            <div className="mt-2 space-y-2">
              {dueDateOptions.map((option) => (
                <label
                  key={option}
                  className="flex cursor-pointer items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  <input
                    type="checkbox"
                    checked={filterState.selectedDueDateOptions.includes(option)}
                    onChange={(e) => handleDueDateToggle(option, e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-dark-tertiary dark:bg-dark-tertiary"
                  />
                  <span>{dueDateOptionLabels[option]}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Clear All Button */}
      {isFilterActive(filterState) && (
        <div className="border-t border-gray-200 px-4 py-3 dark:border-dark-tertiary">
          <button
            type="button"
            onClick={() => onFilterChange(initialFilterState)}
            className="w-full text-center text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Clear All
          </button>
        </div>
      )}
    </div>
  );
};

export default FilterDropdown;
