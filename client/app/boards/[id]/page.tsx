"use client";

import { useState, use } from "react";
import BoardHeader from "@/app/boards/BoardHeader";
import Board from "../BoardView";
import Table from "../TableView";
import TaskCreateModal from "@/components/TaskCreateModal";
import {
  useGetProjectsQuery,
  useGetTagsQuery,
  useGetTasksQuery,
} from "@/state/api";
import {
  FilterState,
  initialFilterState,
  SortState,
  initialSortState,
} from "@/lib/filterTypes";
import { isFilterActive, isSortActive } from "@/lib/filterUtils";

type Props = {
  params: Promise<{ id: string }>;
};

const BoardPage = ({ params }: Props) => {
  const { id } = use(params);
  const [activeTab, setActiveTab] = useState("Board");
  const [isModalNewTaskOpen, setIsModalNewTaskOpen] = useState(false);
  const [filterState, setFilterState] =
    useState<FilterState>(initialFilterState);
  const [sortState, setSortState] = useState<SortState>(initialSortState);
  const [showMyTasks, setShowMyTasks] = useState(false);

  const { data: projects, refetch: refetchProjects } = useGetProjectsQuery();
  const { data: tags = [] } = useGetTagsQuery();
  const { data: tasks = [], refetch: refetchTasks } = useGetTasksQuery({
    projectId: Number(id),
  });
  const project = projects?.find((p) => p.id === Number(id));

  const totalTasks = tasks.length;
  const totalPoints = tasks.reduce((sum, task) => sum + (task.points || 0), 0);

  const handleFilterChange = (newState: FilterState) =>
    setFilterState(newState);
  const handleSortChange = (newState: SortState) => setSortState(newState);

  return (
    <div className="flex h-full flex-col">
      <TaskCreateModal
        isOpen={isModalNewTaskOpen}
        onClose={() => setIsModalNewTaskOpen(false)}
        projectId={Number(id)}
      />
      <BoardHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        boardName={project?.name || "Board"}
        boardDescription={project?.description}
        boardId={id}
        isActive={project?.isActive !== false}
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
        onRefresh={() => {
          refetchProjects();
          refetchTasks();
        }}
      />
      <div className="min-h-0 flex-1">
        {activeTab === "Board" && (
          <Board
            id={id}
            setIsModalNewTaskOpen={setIsModalNewTaskOpen}
            filterState={filterState}
            sortState={sortState}
            showMyTasks={showMyTasks}
          />
        )}
        {activeTab === "Table" && (
          <Table
            id={id}
            setIsModalNewTaskOpen={setIsModalNewTaskOpen}
            filterState={filterState}
          />
        )}
      </div>
    </div>
  );
};

export default BoardPage;
