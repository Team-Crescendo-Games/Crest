"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useGetSprintQuery, useGetTagsQuery } from "@/state/api";
import {
  FilterState,
  initialFilterState,
  SortState,
  initialSortState,
} from "@/lib/filterTypes";
import { isFilterActive, isSortActive } from "@/lib/filterUtils";
import SprintHeader from "@/app/sprints/SprintHeader";
import BoardView from "@/app/sprints/BoardView";
import TableView from "@/app/sprints/TableView";
import TimelineView from "@/app/sprints/TimelineView";
import ModalNewTask from "@/components/ModalNewTask";

const SprintPage = () => {
  const params = useParams();
  const sprintId = Number(params.id);

  const [activeTab, setActiveTab] = useState<"Board" | "Table" | "Timeline">(
    "Board",
  );
  const [isModalNewTaskOpen, setIsModalNewTaskOpen] = useState(false);
  const [filterState, setFilterState] =
    useState<FilterState>(initialFilterState);
  const [sortState, setSortState] = useState<SortState>(initialSortState);
  const [showMyTasks, setShowMyTasks] = useState(false);

  const {
    data: sprint,
    isLoading,
    error,
    refetch,
  } = useGetSprintQuery(sprintId);
  const { data: tags = [] } = useGetTagsQuery();

  const sprintTasks = sprint?.tasks || [];
  const totalTasks = sprintTasks.length;
  const totalPoints = sprintTasks.reduce(
    (sum, task) => sum + (task.points || 0),
    0,
  );

  const handleFilterChange = (newState: FilterState) =>
    setFilterState(newState);
  const handleSortChange = (newState: SortState) => setSortState(newState);

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

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <ModalNewTask
        isOpen={isModalNewTaskOpen}
        onClose={() => setIsModalNewTaskOpen(false)}
        sprintId={sprintId}
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
      />
      <div className="flex-1 overflow-auto">
        {activeTab === "Board" && (
          <BoardView
            sprintId={sprintId}
            tasks={sprint.tasks || []}
            setIsModalNewTaskOpen={setIsModalNewTaskOpen}
            filterState={filterState}
            sortState={sortState}
            showMyTasks={showMyTasks}
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
