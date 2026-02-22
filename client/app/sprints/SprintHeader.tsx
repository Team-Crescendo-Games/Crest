"use client";

import { useState } from "react";
import {
  Archive,
  Calendar,
  ClipboardList,
  Copy,
  Diamond,
  Settings,
  Table,
  Users,
} from "lucide-react";
import { BiColumns } from "react-icons/bi";
import { MdTimeline } from "react-icons/md";
import { useRouter } from "next/navigation";
import { formatUTCDate } from "@/lib/dateUtils";
import { FilterState, SortState } from "@/lib/filterTypes";
import { SPRINT_MAIN_COLOR } from "@/lib/entityColors";
import {
  TAB_BUTTON_BASE_STYLES,
  TAB_BUTTON_INDICATOR_STYLES,
} from "@/lib/styleConstants";
import {
  Tag,
  useDuplicateSprintMutation,
  useArchiveSprintMutation,
} from "@/state/api";
import ConfirmationMenu from "@/components/ConfirmationMenu";
import HeaderButton from "@/components/HeaderButton";
import HeaderToolbar from "@/components/UI/generic/HeaderToolbar";
import RefreshButton from "@/components/RefreshButton";
import SearchInput from "@/components/SearchInput";
import PresenceAvatars from "@/components/PresenceAvatars";
import type { CollaboratorUser } from "@/lib/useCollaboration";

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
  onRefresh: () => void;
  isStandupMode: boolean;
  onToggleStandup: () => void;
  collaborators?: CollaboratorUser[];
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
  onRefresh,
  isStandupMode,
  onToggleStandup,
  collaborators = [],
}: Props) => {
  const router = useRouter();
  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [includeFinishedTasks, setIncludeFinishedTasks] = useState(false);
  const [newSprintTitle, setNewSprintTitle] = useState("");
  const [duplicateSprint, { isLoading: isDuplicating }] =
    useDuplicateSprintMutation();
  const [archiveSprint, { isLoading: isArchiving }] =
    useArchiveSprintMutation();

  const handleDuplicate = async () => {
    try {
      const title = newSprintTitle.trim() || `${sprintTitle} (Copy)`;
      const newSprint = await duplicateSprint({
        sprintId,
        title,
        includeFinishedTasks,
      }).unwrap();
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
    return formatUTCDate(dateString);
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
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-200 px-2 py-1 text-sm font-medium text-gray-700 dark:bg-dark-tertiary dark:text-white">
              <ClipboardList className="h-3.5 w-3.5" /> {totalTasks} ·{" "}
              <Diamond className="h-3 w-3" fill="currentColor" /> {totalPoints}
            </span>
            <HeaderButton
              onClick={() => setShowDuplicateConfirm(true)}
              disabled={isDuplicating}
              icon={<Copy className="h-5 w-5" />}
              tooltip="Duplicate sprint"
            />
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
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
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
                <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
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
            <HeaderButton
              onClick={() => setShowArchiveConfirm(true)}
              disabled={isArchiving}
              icon={<Archive className="h-5 w-5" />}
              tooltip={isActive ? "Archive sprint" : "Unarchive sprint"}
            />
            <ConfirmationMenu
              isOpen={showArchiveConfirm}
              onClose={() => setShowArchiveConfirm(false)}
              onConfirm={handleArchive}
              title={isActive ? "Archive Sprint" : "Unarchive Sprint"}
              message={
                isActive
                  ? `Archive "${sprintTitle}"? It will be hidden from the sidebar by default.`
                  : `Unarchive "${sprintTitle}"? It will be visible in the sidebar again.`
              }
              confirmLabel={isActive ? "Archive" : "Unarchive"}
              isLoading={isArchiving}
              variant="warning"
            />
            <div className="group relative cursor-pointer">
              <RefreshButton onRefresh={onRefresh} label="Sprint" />
              <div className="pointer-events-none absolute left-1/2 top-full z-30 mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs font-normal text-white opacity-0 transition-opacity group-hover:opacity-100">
                Refresh
              </div>
            </div>
            <HeaderButton
              onClick={onToggleStandup}
              icon={<Users className="h-5 w-5" />}
              tooltip={isStandupMode ? "Exit standup" : "Standup mode"}
              active={isStandupMode}
              activeClassName="cursor-pointer text-purple-500 dark:text-purple-400"
            />
            <HeaderButton
              href={`/sprints/${sprintId}/settings`}
              icon={<Settings className="h-5 w-5" />}
              tooltip="Settings"
            />
            <div className="ml-auto">
              <PresenceAvatars collaborators={collaborators} />
            </div>
          </h1>
          {/* Date display with calendar icon */}
          {(sprintStartDate || sprintDueDate) && (
            <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
              <Calendar className="h-4 w-4" />
              <span>
                {sprintStartDate ? formatDate(sprintStartDate) : "—"} –{" "}
                {sprintDueDate ? formatDate(sprintDueDate) : "—"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Search */}
      <div
        className={`mb-2 ${isStandupMode ? "pointer-events-none opacity-40" : ""}`}
      >
        <SearchInput
          filterState={filterState}
          onFilterChange={onFilterChange}
          accentColor={SPRINT_MAIN_COLOR}
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
      className={`${TAB_BUTTON_BASE_STYLES} ${
        isActive
          ? "font-bold text-gray-900 dark:text-white"
          : "text-gray-500 hover:text-purple-500 dark:text-neutral-500 dark:hover:text-purple-400"
      }`}
      style={isActive ? { color: SPRINT_MAIN_COLOR } : undefined}
      onClick={() => setActiveTab(name)}
    >
      {isActive && (
        <span
          className={TAB_BUTTON_INDICATOR_STYLES}
          style={{ backgroundColor: SPRINT_MAIN_COLOR }}
        />
      )}
      {icon}
      {name}
    </button>
  );
};

export default SprintHeader;
