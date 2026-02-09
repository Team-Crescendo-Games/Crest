"use client";

import { useState, use } from "react";
import UserHeader from "./UserHeader";
import UserBoardView from "./BoardView";
import UserTableView from "./TableView";
import ModalNewTask from "@/components/ModalNewTask";
import { useGetUserByIdQuery, useGetTasksAssignedToUserQuery, useGetTagsQuery } from "@/state/api";
import { FilterState, initialFilterState, SortState, initialSortState } from "@/lib/filterTypes";
import { isFilterActive, isSortActive } from "@/lib/filterUtils";

type Props = {
  params: Promise<{ id: string }>;
};

const UserBoardPage = ({ params }: Props) => {
  const { id } = use(params);
  const userId = Number(id);

  const [activeTab, setActiveTab] = useState("Board");
  const [isModalNewTaskOpen, setIsModalNewTaskOpen] = useState(false);
  const [filterState, setFilterState] = useState<FilterState>(initialFilterState);
  const [sortState, setSortState] = useState<SortState>(initialSortState);
  const [showMyTasks, setShowMyTasks] = useState(false);

  const { data: user, isLoading, isError } = useGetUserByIdQuery(userId);
  const { data: tags = [] } = useGetTagsQuery();
  const { data: tasks = [] } = useGetTasksAssignedToUserQuery(userId);

  const totalTasks = tasks.length;
  const totalPoints = tasks.reduce((sum, task) => sum + (task.points || 0), 0);

  const handleFilterChange = (newState: FilterState) => setFilterState(newState);
  const handleSortChange = (newState: SortState) => setSortState(newState);

  if (isLoading) return <div className="p-8">Loading...</div>;
  if (isError || !user) return <div className="p-8">User not found</div>;

  return (
    <div className="flex h-full flex-col">
      <ModalNewTask
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
          />
        )}
      </div>
    </div>
  );
};

export default UserBoardPage;
