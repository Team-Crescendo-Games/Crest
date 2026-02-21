"use client";

import {
  ArrowLeft,
  ClipboardList,
  Diamond,
  Table,
  User as UserIcon,
} from "lucide-react";
import { BiColumns } from "react-icons/bi";
import Link from "next/link";
import React from "react";
import { FilterState, SortState } from "@/lib/filterTypes";
import { USER_MAIN_COLOR } from "@/lib/entityColors";
import {
  TAB_BUTTON_BASE_STYLES,
  TAB_BUTTON_INDICATOR_STYLES,
} from "@/lib/styleConstants";
import { Tag, User } from "@/state/api";
import HeaderToolbar from "@/components/UI/generic/HeaderToolbar";
import RefreshButton from "@/components/RefreshButton";
import S3Image from "@/components/S3Image";
import SearchInput from "@/components/SearchInput";

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
  showMyTasks: boolean;
  onShowMyTasksChange: (show: boolean) => void;
  onRefresh: () => void;
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
  showMyTasks,
  onShowMyTasksChange,
  onRefresh,
}: Props) => {
  return (
    <div className="px-4 xl:px-6">
      <div className="pt-4">
        <Link
          href="/users"
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-neutral-400 dark:hover:text-neutral-200"
        >
          <ArrowLeft className="h-4 w-4" />
          All Users
        </Link>
      </div>

      <div className="pb-4 pt-4 lg:pb-4">
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
                {user.fullName || user.username}
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-200 px-2 py-1 text-sm font-medium text-gray-700 dark:bg-dark-tertiary dark:text-white">
                <ClipboardList className="h-3.5 w-3.5" /> {totalTasks} ·{" "}
                <Diamond className="h-3 w-3" fill="currentColor" />{" "}
                {totalPoints}
              </span>
              <div className="group relative cursor-pointer">
                <RefreshButton onRefresh={onRefresh} label="User" />
                <div className="pointer-events-none absolute left-1/2 top-full z-30 mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs font-normal text-white opacity-0 transition-opacity group-hover:opacity-100">
                  Refresh
                </div>
              </div>
            </div>
            {user.email && (
              <p className="text-sm text-gray-500 dark:text-neutral-400">
                {user.email}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-2">
        <SearchInput
          filterState={filterState}
          onFilterChange={onFilterChange}
          accentColor={USER_MAIN_COLOR}
        />
      </div>

      {/* TABS */}
      <div className="flex flex-wrap items-end justify-between gap-1">
        <div className="relative flex items-end gap-2 after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:bg-gray-200 dark:after:bg-stroke-dark md:gap-4">
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
        <HeaderToolbar
          filterState={filterState}
          onFilterChange={onFilterChange}
          tags={tags}
          isFilterActive={isFilterActive}
          sortState={sortState}
          onSortChange={onSortChange}
          isSortActive={isSortActive}
          showMyTasks={showMyTasks}
          onShowMyTasksChange={onShowMyTasksChange}
          hideMyTasks
        />
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
      className={`${TAB_BUTTON_BASE_STYLES} ${
        isActive
          ? "font-bold text-gray-900 dark:text-white"
          : "text-gray-500 hover:text-blue-500 dark:text-neutral-500 dark:hover:text-blue-400"
      }`}
      style={isActive ? { color: USER_MAIN_COLOR } : undefined}
      onClick={() => setActiveTab(name)}
    >
      {isActive && (
        <span
          className={TAB_BUTTON_INDICATOR_STYLES}
          style={{ backgroundColor: USER_MAIN_COLOR }}
        />
      )}
      {icon}
      {name}
    </button>
  );
};

export default UserHeader;
