"use client";

import { useState } from "react";
import { Archive, Settings, Table } from "lucide-react";
import { BiColumns } from "react-icons/bi";
import Link from "next/link";
import React from "react";
import { FilterState, SortState } from "@/lib/filterTypes";
import { BOARD_MAIN_COLOR } from "@/lib/entityColors";
import {
  TAB_BUTTON_BASE_STYLES,
  TAB_BUTTON_INDICATOR_STYLES,
} from "@/lib/styleConstants";
import { Tag, useArchiveProjectMutation } from "@/state/api";
import ConfirmationMenu from "@/components/ConfirmationMenu";
import HeaderToolbar from "@/components/HeaderToolbar";
import RefreshButton from "@/components/RefreshButton";

type Props = {
  activeTab: string;
  setActiveTab: (tabName: string) => void;
  boardName: string;
  boardDescription?: string;
  boardId: string;
  isActive?: boolean;
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

const BoardHeader = ({
  activeTab,
  setActiveTab,
  boardName,
  boardDescription,
  boardId,
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
  showMyTasks,
  onShowMyTasksChange,
  onRefresh,
}: Props) => {
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [archiveProject, { isLoading: isArchiving }] =
    useArchiveProjectMutation();

  const handleArchive = async () => {
    try {
      await archiveProject(Number(boardId)).unwrap();
      setShowArchiveConfirm(false);
    } catch (error) {
      console.error("Failed to archive board:", error);
    }
  };

  return (
    <div className="px-4 xl:px-6">
      {/* Inactive Board Banner */}
      {!isActive && (
        <div className="mt-4 rounded-lg bg-orange-100 px-4 py-2 text-sm text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
          This board is inactive
        </div>
      )}

      <div className="pt-6 pb-6 lg:pt-8 lg:pb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold dark:text-white">
            {boardName}
          </h1>
          <span className="dark:bg-dark-tertiary inline-block rounded-full bg-gray-200 px-2 py-1 text-sm font-medium text-gray-700 dark:text-white">
            {totalTasks} tasks · {totalPoints} pts
          </span>
          <button
            onClick={() => setShowArchiveConfirm(true)}
            disabled={isArchiving}
            className="text-gray-500 hover:text-gray-700 disabled:opacity-50 dark:text-neutral-400 dark:hover:text-neutral-200"
            aria-label={isActive ? "Archive board" : "Unarchive board"}
            title={isActive ? "Archive board" : "Unarchive board"}
          >
            <Archive className="h-5 w-5" />
          </button>
          <ConfirmationMenu
            isOpen={showArchiveConfirm}
            onClose={() => setShowArchiveConfirm(false)}
            onConfirm={handleArchive}
            title={isActive ? "Archive Board" : "Unarchive Board"}
            message={
              isActive
                ? `Archive "${boardName}"? It will be hidden from the sidebar by default.`
                : `Unarchive "${boardName}"? It will be visible in the sidebar again.`
            }
            confirmLabel={isActive ? "Archive" : "Unarchive"}
            isLoading={isArchiving}
            variant="warning"
          />
          <RefreshButton onRefresh={onRefresh} label="Board" />
          <Link
            href={`/boards/${boardId}/settings`}
            className="text-gray-500 hover:text-gray-700 dark:text-neutral-400 dark:hover:text-neutral-200"
            aria-label="Settings"
          >
            <Settings className="h-5 w-5" />
          </Link>
        </div>
        {boardDescription && (
          <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">
            {boardDescription}
          </p>
        )}
      </div>

      {/* TABS */}
      <div className="flex flex-wrap items-end justify-between gap-1">
        <div className="dark:after:bg-stroke-dark relative flex items-end gap-2 after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:bg-gray-200 md:gap-4">
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
          accentColor={BOARD_MAIN_COLOR}
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
      style={isActive ? { color: BOARD_MAIN_COLOR } : undefined}
      onClick={() => setActiveTab(name)}
    >
      {isActive && (
        <span
          className={TAB_BUTTON_INDICATOR_STYLES}
          style={{ backgroundColor: BOARD_MAIN_COLOR }}
        />
      )}
      {icon}
      {name}
    </button>
  );
};

export default BoardHeader;
