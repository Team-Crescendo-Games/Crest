"use client";

import { useState } from "react";
import { ArrowLeft, ArrowUpDown, Filter, Table, X } from "lucide-react";
import { BiColumns } from "react-icons/bi";
import Link from "next/link";
import React from "react";
import { FilterState, DueDateOption, SortState, SortField } from "@/lib/filterTypes";
import { PRIORITY_COLORS } from "@/lib/priorityColors";
import { USER_MAIN_COLOR } from "@/lib/entityColors";
import { Tag, Priority, User } from "@/state/api";
import FilterDropdown from "@/components/FilterDropdown";
import S3Image from "@/components/S3Image";
import { User as UserIcon } from "lucide-react";

type Props = {
  activeTab: string;
  setActiveTab: (tabName: string) => void;
  user: User;
  filterState: FilterState;
  onFilterChange: (newState: FilterState) => void;
  tags: Tag[];
  isFilterActive: boolean;
  totalTasks: number;
  totalPoints: number;
  sortState: SortState;
  onSortChange: (newState: SortState) => void;
  isSortActive: boolean;
};

const UserHeader = ({
  activeTab,
  setActiveTab,
  user,
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
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

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
    <div className="px-4 xl:px-6">
      <div className="pt-4">
        <Link
          href="/users"
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-neutral-400 dark:hover:text-neutral-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Users
        </Link>
      </div>

      <div className="pb-6 pt-4 lg:pb-4">
        <div className="flex items-center gap-4">
          {user.userId && user.profilePictureExt ? (
            <S3Image
              s3Key={`users/${user.userId}/profile.${user.profilePictureExt}`}
              alt={user.username}
              width={48}
              height={48}
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-dark-tertiary">
              <UserIcon className="h-6 w-6 text-gray-500 dark:text-neutral-400" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold dark:text-white">
                {user.username}
              </h1>
              <span className="inline-block rounded-full bg-gray-200 px-2 py-1 text-sm font-medium text-gray-700 dark:bg-dark-tertiary dark:text-white">
                {totalTasks} tasks · {totalPoints} pts
              </span>
            </div>
            {user.email && (
              <p className="text-sm text-gray-500 dark:text-neutral-400">
                {user.email}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* TABS */}
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
        </div>
        <div className="flex items-center gap-2">
          {/* Active filter pills */}
          <div className="flex flex-wrap items-center gap-1.5 max-w-xs">
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

          {/* Sort button */}
          <div className="relative">
            <button
              className="relative text-gray-500 hover:text-gray-600 dark:text-neutral-500 dark:hover:text-gray-300"
              onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
              aria-label="Toggle sort dropdown"
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

          {/* Filter button */}
          <div className="relative">
            <button
              className="relative text-gray-500 hover:text-gray-600 dark:text-neutral-500 dark:hover:text-gray-300"
              onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
              aria-label="Toggle filter dropdown"
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
      </div>
    </div>
  );
};

type TabButtonProps = {
  name: string;
  icon: React.ReactNode;
  setActiveTab: (tabName: string) => void;
  activeTab: string;
};

const TabButton = ({ name, icon, setActiveTab, activeTab }: TabButtonProps) => {
  const isActive = activeTab === name;

  return (
    <button
      className={`relative flex items-center gap-2 px-1 py-2 
      after:absolute after:-bottom-2.25 after:left-0 after:h-px after:w-full 
      sm:px-2 lg:px-4 ${
        isActive
          ? ""
          : "text-gray-500 hover:text-blue-500 dark:text-neutral-500 dark:hover:text-blue-400"
      }`}
      style={isActive ? { color: USER_MAIN_COLOR } : undefined}
      onClick={() => setActiveTab(name)}
    >
      {isActive && (
        <span
          className="absolute -bottom-2.25 left-0 h-px w-full"
          style={{ backgroundColor: USER_MAIN_COLOR }}
        />
      )}
      {icon}
      {name}
    </button>
  );
};

export default UserHeader;
