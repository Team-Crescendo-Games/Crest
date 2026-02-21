"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useGetSprintQuery, useGetTagsQuery } from "@/state/api";
import { useWorkspace } from "@/lib/useWorkspace"; 
import {
  FilterState,
  initialFilterState,
  SortState,
  initialSortState,
} from "@/lib/filterTypes";
import { isFilterActive, isSortActive } from "@/lib/filterUtils";
import SprintHeader from "@/app/sprints/SprintHeader";
import BoardView from "@/components/sprints/sprintBoardView";
import TableView from "@/components/sprints/sprintTableView";
import TimelineView from "@/components/sprints/sprintTimelineView";
import StandupMode from "@/components/StandupMode";
import TaskCreateModal from "@/components/tasks/taskCreateModal";
import { useCollaboration } from "@/lib/useCollaboration";

const SprintPage = () => {
  const params = useParams();
  const sprintId = Number(params.id);

  const { activeWorkspaceId } = useWorkspace(); 

  const [activeTab, setActiveTab] = useState<"Board" | "Table" | "Timeline">(
    "Board",
  );
  const [isModalNewTaskOpen, setIsModalNewTaskOpen] = useState(false);
  const [filterState, setFilterState] =
    useState<FilterState>(initialFilterState);
  const [sortState, setSortState] = useState<SortState>(initialSortState);
  const [showMyTasks, setShowMyTasks] = useState(false);
  const [isStandupMode, setIsStandupMode] = useState(false);
  const [standupUserId, setStandupUserId] = useState<number | null>(null);

  const [preStandupFilterState, setPreStandupFilterState] =
    useState<FilterState | null>(null);

  const { collaborators, taskSelectionMap, selectTask, notifyTaskUpdate } =
    useCollaboration(`sprint-${sprintId}`);

  const {
    data: sprint,
    isLoading,
    error,
    refetch,
  } = useGetSprintQuery(sprintId);

  const { data: tags = [] } = useGetTagsQuery(activeWorkspaceId ?? 0, {
    skip: !activeWorkspaceId,
  });

  const sprintTasks = sprint?.tasks || [];
  const totalTasks = sprintTasks.length;
  const totalPoints = sprintTasks.reduce(
    (sum, task) => sum + (task.points || 0),
    0,
  );

  const handleFilterChange = (newState: FilterState) =>
    setFilterState(newState);
  const handleSortChange = (newState: SortState) => setSortState(newState);

  const handleToggleStandup = () => {
    if (!isStandupMode) {
      setPreStandupFilterState(filterState);
      setFilterState({
        ...initialFilterState,
        selectedAssigneeIds: [],
      });
      setStandupUserId(null);
      setShowMyTasks(false);
    } else {
      if (preStandupFilterState) {
        setFilterState(preStandupFilterState);
      }
      setPreStandupFilterState(null);
      setStandupUserId(null);
    }
    setIsStandupMode(!isStandupMode);
  };

  const handleStandupUserSelect = (userId: number | null) => {
    setStandupUserId(userId);
    if (userId !== null) {
      setFilterState((prev) => ({
        ...prev,
        selectedAssigneeIds: [userId],
      }));
    } else {
      setFilterState((prev) => ({
        ...prev,
        selectedAssigneeIds: [],
      }));
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-gray-500 dark:text-gray-400">
          Loading sprint...
        </div>
      </div>
    );
  }

  if (error || !sprint) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-red-500">
          {error ? "Error loading sprint" : "Sprint not found"}
        </div>
      </div>
    );
  }

  // The rest of your JSX layout remains unchanged
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <TaskCreateModal
        isOpen={isModalNewTaskOpen}
        onClose={() => setIsModalNewTaskOpen(false)}
        sprintId={sprintId}
        onTaskCreated={notifyTaskUpdate}
      />
      <SprintHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sprintTitle={sprint.title}
        sprintStartDate={sprint.startDate}
        sprintDueDate={sprint.dueDate}
        sprintId={sprintId}
        isActive={sprint.isActive !== false}
        filterState={filterState}
        onFilterChange={handleFilterChange}
        tags={tags}
        isFilterActive={isFilterActive(filterState)}
        totalTasks={totalTasks}
        totalPoints={totalPoints}
        sortState={sortState}
        onSortChange={handleSortChange}
        isSortActive={isSortActive(sortState)}
        showMyTasks={showMyTasks}
        onShowMyTasksChange={setShowMyTasks}
        onRefresh={refetch}
        isStandupMode={isStandupMode}
        onToggleStandup={handleToggleStandup}
        collaborators={collaborators}
      />
      {isStandupMode && (
        <StandupMode
          selectedUserId={standupUserId}
          onSelectUser={handleStandupUserSelect}
        />
      )}
      <div className="flex-1 overflow-auto">
        {activeTab === "Board" && (
          <BoardView
            sprintId={sprintId}
            tasks={sprint.tasks || []}
            setIsModalNewTaskOpen={setIsModalNewTaskOpen}
            filterState={filterState}
            sortState={sortState}
            showMyTasks={showMyTasks}
            taskSelectionMap={taskSelectionMap}
            onTaskSelect={selectTask}
            onTaskUpdate={notifyTaskUpdate}
          />
        )}
        {activeTab === "Table" && (
          <TableView
            sprintId={sprintId}
            tasks={sprint.tasks || []}
            setIsModalNewTaskOpen={setIsModalNewTaskOpen}
            filterState={filterState}
            sortState={sortState}
          />
        )}
        {activeTab === "Timeline" && (
          <TimelineView
            sprintId={sprintId}
            tasks={sprint.tasks || []}
            setIsModalNewTaskOpen={setIsModalNewTaskOpen}
            filterState={filterState}
            sortState={sortState}
            sprintStartDate={sprint.startDate}
            sprintDueDate={sprint.dueDate}
            showMyTasks={showMyTasks}
          />
        )}
      </div>
    </div>
  );
};

export default SprintPage;
