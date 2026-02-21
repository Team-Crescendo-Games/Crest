"use client";

import { useState, use } from "react";
import UserHeader from "@/components/users/userHeader";
import UserBoardView from "@/components/users/userBoardView";
import UserTableView from "@/components/users/userTableView";
import TaskCreateModal from "@/components/tasks/taskCreateModal";
import {
  useGetUserByIdQuery,
  useGetTasksAssignedToUserQuery,
  useGetTagsQuery,
  useGetBoardsQuery,
} from "@/state/api";
import {
  FilterState,
  initialFilterState,
  SortState,
  initialSortState,
} from "@/lib/filterTypes";
import { isFilterActive, isSortActive } from "@/lib/filterUtils";
import { useWorkspace } from "@/lib/useWorkspace";

type Props = {
  params: Promise<{ id: string }>;
};

export default function UserBoardPage({ params }: Props) {
  const { id } = use(params);
  const userId = Number(id);
  const { activeWorkspaceId } = useWorkspace();

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

  // Scope tags and boards to the active workspace
  const { data: tags = [] } = useGetTagsQuery(activeWorkspaceId!, {
    skip: !activeWorkspaceId,
  });
  const { data: boards = [] } = useGetBoardsQuery(activeWorkspaceId!, {
    skip: !activeWorkspaceId,
  });

  const { data: tasks = [], refetch: refetchTasks } =
    useGetTasksAssignedToUserQuery(userId);

  // Filter out tasks from archived boards AND boards outside the current workspace
  const activeBoardIds = new Set(
    boards.filter((b) => b.isActive).map((b) => b.id),
  );

  const activeTasks = tasks.filter(
    (task) => !task.boardId || activeBoardIds.has(task.boardId),
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
}
