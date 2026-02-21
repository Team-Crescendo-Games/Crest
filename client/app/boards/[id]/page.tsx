"use client";

import { useState, use } from "react";
import BoardHeader from "@/components/boards/boardHeader";
import BoardView from "@/components/boards/boardView";
import BoardTableView from "@/components/boards/boardTableView";
import TaskCreateModal from "@/components/TaskCreateModal";
import {
  useGetBoardsQuery,
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
import { useCollaboration } from "@/lib/useCollaboration";
import { useWorkspace } from "@/lib/useWorkspace";

type Props = {
  params: Promise<{ id: string }>;
};

export default function BoardPage({ params }: Props) {
  const { id } = use(params);
  const boardId = Number(id);
  const { activeWorkspaceId } = useWorkspace();

  const [activeTab, setActiveTab] = useState("Board");
  const [isModalNewTaskOpen, setIsModalNewTaskOpen] = useState(false);
  const [filterState, setFilterState] =
    useState<FilterState>(initialFilterState);
  const [sortState, setSortState] = useState<SortState>(initialSortState);
  const [showMyTasks, setShowMyTasks] = useState(false);

  const { collaborators, taskSelectionMap, selectTask, notifyTaskUpdate } =
    useCollaboration(`board-${boardId}`);

  const { data: boards, refetch: refetchBoards } = useGetBoardsQuery(
    activeWorkspaceId || -1,
    {
      skip: !activeWorkspaceId,
    },
  );

  const { data: tags = [] } = useGetTagsQuery(activeWorkspaceId || -1, {
    skip: !activeWorkspaceId,
  });

  const { data: tasks = [], refetch: refetchTasks } = useGetTasksQuery({
    boardId,
  });

  const board = boards?.find((b) => b.id === boardId);

  const totalTasks = tasks.length;
  const totalPoints = tasks.reduce((sum, task) => sum + (task.points || 0), 0);

  const handleFilterChange = (newState: FilterState) =>
    setFilterState(newState);
  const handleSortChange = (newState: SortState) => setSortState(newState);

  if (!board) return null; // TODO: Add loading state

  return (
    <div className="flex h-full flex-col">
      <TaskCreateModal
        isOpen={isModalNewTaskOpen}
        onClose={() => setIsModalNewTaskOpen(false)}
        boardId={boardId}
        onTaskCreated={notifyTaskUpdate}
      />

      <BoardHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        boardName={board.name || "Board"}
        boardDescription={board.description}
        boardId={id}
        isActive={board.isActive !== false}
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
          refetchBoards();
          refetchTasks();
        }}
        collaborators={collaborators}
      />

      <div className="min-h-0 flex-1">
        {activeTab === "Board" && (
          <BoardView
            boardId={id}
            tasks={tasks}
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
          <BoardTableView
            boardId={id}
            tasks={tasks}
            setIsModalNewTaskOpen={setIsModalNewTaskOpen}
            filterState={filterState}
            sortState={sortState}
          />
        )}
      </div>
    </div>
  );
}
