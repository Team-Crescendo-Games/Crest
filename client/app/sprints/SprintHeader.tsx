"use client";

import { useState } from "react";
import { Archive, Calendar, Copy, Settings, Table } from "lucide-react";
import { BiColumns } from "react-icons/bi";
import { MdTimeline } from "react-icons/md";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FilterState, SortState } from "@/lib/filterTypes";
import { SPRINT_MAIN_COLOR } from "@/lib/entityColors";
import { Tag, useDuplicateSprintMutation, useArchiveSprintMutation } from "@/state/api";
import ConfirmationMenu from "@/components/ConfirmationMenu";
import HeaderToolbar from "@/components/HeaderToolbar";

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
  showMyTasks: boolean;
  onShowMyTasksChange: (show: boolean) => void;
};

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
  showMyTasks,
  onShowMyTasksChange,
}: Props) => {
  const router = useRouter();
  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [includeFinishedTasks, setIncludeFinishedTasks] = useState(false);
  const [newSprintTitle, setNewSprintTitle] = useState("");
  const [duplicateSprint, { isLoading: isDuplicating }] = useDuplicateSprintMutation();
  const [archiveSprint, { isLoading: isArchiving }] = useArchiveSprintMutation();

  const handleDuplicate = async () => {
    try {
      const title = newSprintTitle.trim() || `${sprintTitle} (Copy)`;
      const newSprint = await duplicateSprint({ sprintId, title, includeFinishedTasks }).unwrap();
      setShowDuplicateConfirm(false);
      setIncludeFinishedTasks(false);
      setNewSprintTitle("");
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
      
      {/* Sprint Title and Dates */}
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
                setNewSprintTitle("");
              }}
              onConfirm={handleDuplicate}
              title="Duplicate Sprint"
              message={`Create a copy of "${sprintTitle}"?`}
              confirmLabel="Duplicate"
              isLoading={isDuplicating}
              variant="info"
            >
              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    New Sprint Name
                  </label>
                  <input
                    type="text"
                    value={newSprintTitle}
                    onChange={(e) => setNewSprintTitle(e.target.value)}
                    placeholder={`${sprintTitle} (Copy)`}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white dark:placeholder-gray-500"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={includeFinishedTasks}
                    onChange={(e) => setIncludeFinishedTasks(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 accent-blue-600 dark:border-neutral-600"
                  />
                  Migrate finished tasks?
                </label>
              </div>
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
          <TabButton
            name="Timeline"
            icon={<MdTimeline className="h-5 w-5" />}
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
          accentColor={SPRINT_MAIN_COLOR}
        />
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
