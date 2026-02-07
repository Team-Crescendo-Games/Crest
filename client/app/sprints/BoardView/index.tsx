"use client";

import { Task as TaskType } from "@/state/api";
import BoardView from "@/components/BoardView";
import { FilterState } from "@/lib/filterTypes";

type Props = {
    sprintId: number;
    tasks: TaskType[];
    setIsModalNewTaskOpen: (isOpen: boolean) => void;
    filterState: FilterState;
};

/**
 * Sprint BoardView wrapper component
 * Uses the shared BoardView component with sprint tasks
 * 
 * Validates: Requirements 5.4, 6.1, 6.2, 6.3, 6.4, 9.2
 */
const SprintBoardView = ({ sprintId: _sprintId, tasks, setIsModalNewTaskOpen, filterState }: Props) => {
    return (
        <BoardView
            tasks={tasks}
            setIsModalNewTaskOpen={setIsModalNewTaskOpen}
            filterState={filterState}
        />
    );
};

export default SprintBoardView;
