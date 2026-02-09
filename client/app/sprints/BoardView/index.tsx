"use client";

import { Task as TaskType } from "@/state/api";
import BoardView from "@/components/BoardView";
import { FilterState, SortState } from "@/lib/filterTypes";

type Props = {
    sprintId: number;
    tasks: TaskType[];
    setIsModalNewTaskOpen: (isOpen: boolean) => void;
    filterState: FilterState;
    sortState: SortState;
    showMyTasks?: boolean;
};

/**
 * Sprint BoardView wrapper component
 * Uses the shared BoardView component with sprint tasks
 */
const SprintBoardView = ({ sprintId: _sprintId, tasks, setIsModalNewTaskOpen, filterState, sortState, showMyTasks = false }: Props) => {
    return (
        <BoardView
            tasks={tasks}
            setIsModalNewTaskOpen={setIsModalNewTaskOpen}
            filterState={filterState}
            sortState={sortState}
            showMyTasks={showMyTasks}
        />
    );
};

export default SprintBoardView;
