"use client";

import { useState, use } from "react";
import UserHeader from "./UserHeader";
import UserBoardView from "./BoardView";
import UserTableView from "./TableView";
import TaskCreateModal from "@/components/tasks/taskCreateModal";
import {
  useGetUserByIdQuery,
  useGetTasksAssignedToUserQuery,
  useGetTagsQuery,
  useGetProjectsQuery,
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

const UserBoardPage = ({ params }: Props) => {
  const { id } = use(params);
  const userId = Number(id);

  const [activeTab, setActiveTab] = useState("Board");
  const [isModalNewTaskOpen, setIsModalNewTaskOpen] = useState(false);
  const [filterState, setFilterState] =
    useState<FilterState>(initialFilterState);
  const [sortState, setSortState] = useState<SortState>(initialSortState);
  const [showMyTasks, setShowMyTasks] = useState(false);

  const {
    data: user,
    isLoading,
    isError,
    refetch: refetchUser,
  } = useGetUserByIdQuery(userId);
  const { data: tags = [] } = useGetTagsQuery();
  const { data: tasks = [], refetch: refetchTasks } =
    useGetTasksAssignedToUserQuery(userId);
  const { data: projects = [] } = useGetProjectsQuery();

  // Filter out tasks from archived boards for stats
  const activeProjectIds = new Set(
    projects.filter((p) => p.isActive).map((p) => p.id),
  );
  const activeTasks = tasks.filter(
    (task) => !task.projectId || activeProjectIds.has(task.projectId),
  );

  const totalTasks = activeTasks.length;
  const totalPoints = activeTasks.reduce(
    (sum, task) => sum + (task.points || 0),
    0,
  );

  const handleFilterChange = (newState: FilterState) =>
    setFilterState(newState);
  const handleSortChange = (newState: SortState) => setSortState(newState);

  if (isLoading) return <div className="p-8">Loading...</div>;
  if (isError || !user) return <div className="p-8">User not found</div>;

  return (
    <div className="flex h-full flex-col">
      <TaskCreateModal
        isOpen={isModalNewTaskOpen}
        onClose={() => setIsModalNewTaskOpen(false)}
        defaultAssigneeId={userId}
      />
      <UserHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
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
          refetchUser();
          refetchTasks();
        }}
      />
      <div className="min-h-0 flex-1">
        {activeTab === "Board" && (
          <UserBoardView
            userId={userId}
            setIsModalNewTaskOpen={setIsModalNewTaskOpen}
            filterState={filterState}
            sortState={sortState}
          />
        )}
        {activeTab === "Table" && (
          <UserTableView
            userId={userId}
            setIsModalNewTaskOpen={setIsModalNewTaskOpen}
            filterState={filterState}
            sortState={sortState}
          />
        )}
      </div>
    </div>
  );
};

export default UserBoardPage;
