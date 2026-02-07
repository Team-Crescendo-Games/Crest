"use client";

import { useState } from "react";
import { Calendar, Filter, Table } from "lucide-react";
import { BiColumns } from "react-icons/bi";
import { FilterState } from "@/lib/filterTypes";
import { Tag } from "@/state/api";
import FilterDropdown from "@/components/FilterDropdown";

type Props = {
  activeTab: "Board" | "Table";
  setActiveTab: (tab: "Board" | "Table") => void;
  sprintTitle: string;
  sprintStartDate?: string;
  sprintDueDate?: string;
  sprintId: number;
  filterState: FilterState;
  onFilterChange: (state: FilterState) => void;
  tags: Tag[];
  isFilterActive: boolean;
  totalTasks: number;
  totalPoints: number;
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
  filterState,
  onFilterChange,
  tags,
  isFilterActive,
  totalTasks,
  totalPoints,
}: Props) => {
  // State for filter dropdown visibility
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);

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
      {/* Sprint Title and Dates - Validates: Requirement 5.2 */}
      <div className="pb-6 pt-6 lg:pb-4 lg:pt-8">
        <div className="flex flex-col gap-2">
          <h1 className="flex items-center gap-3 text-2xl font-bold text-gray-800 dark:text-white">
            {sprintTitle}
            <span className="inline-block rounded-full bg-gray-200 px-2 py-1 text-sm font-medium text-gray-700 dark:bg-dark-tertiary dark:text-white">
              {totalTasks} / {totalPoints}pts
            </span>
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
      <div className="flex flex-wrap-reverse gap-2 border-y border-gray-200 pb-[8px] pt-2 dark:border-stroke-dark md:items-center">
        <div className="flex flex-1 items-center gap-2 md:gap-4">
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
        </div>
        <div className="flex items-center gap-2">
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
  name: "Board" | "Table";
  icon: React.ReactNode;
  setActiveTab: (tabName: "Board" | "Table") => void;
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
      className={`relative flex items-center gap-2 px-1 py-2 text-gray-500 
      after:absolute after:-bottom-2.25 after:left-0 after:h-px after:w-full 
      hover:text-blue-600 dark:text-neutral-500 dark:hover:text-white 
      sm:px-2 lg:px-4 ${
        isActive ? "text-blue-600 after:bg-blue-600 dark:text-white" : ""
      }`}
      onClick={() => setActiveTab(name)}
    >
      {icon}
      {name}
    </button>
  );
};

export default SprintHeader;
