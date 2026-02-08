"use client";

import { useState, use } from "react";
import BoardHeader from "@/app/boards/BoardHeader";
import Board from "../BoardView";
import Table from "../TableView";
import ModalNewTask from "@/components/ModalNewTask";
import { useGetProjectsQuery, useGetTagsQuery, useGetTasksQuery } from "@/state/api";
import { FilterState, initialFilterState, SortState, initialSortState } from "@/lib/filterTypes";
import { isFilterActive, isSortActive } from "@/lib/filterUtils";

type Props = {
    params: Promise<{ id: string }>;
};

const BoardPage = ({ params }: Props) => {
    const { id } = use(params);
    const [activeTab, setActiveTab] = useState("Board");
    const [isModalNewTaskOpen, setIsModalNewTaskOpen] = useState(false);
    const [filterState, setFilterState] = useState<FilterState>(initialFilterState);
    const [sortState, setSortState] = useState<SortState>(initialSortState);
    
    const { data: projects } = useGetProjectsQuery();
    const { data: tags = [] } = useGetTagsQuery();
    const { data: tasks = [] } = useGetTasksQuery({ projectId: Number(id) });
    const project = projects?.find((p) => p.id === Number(id));
    
    const totalTasks = tasks.length;
    const totalPoints = tasks.reduce((sum, task) => sum + (task.points || 0), 0);
    
    const handleFilterChange = (newState: FilterState) => setFilterState(newState);
    const handleSortChange = (newState: SortState) => setSortState(newState);

    return (
        <div>
            <ModalNewTask
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
            />
            {activeTab === "Board" && (
                <Board id={id} setIsModalNewTaskOpen={setIsModalNewTaskOpen} filterState={filterState} sortState={sortState} />
            )}
            {activeTab === "Table" && (
                <Table id={id} setIsModalNewTaskOpen={setIsModalNewTaskOpen} filterState={filterState} />
            )}
        </div>
    );
};

export default BoardPage;
