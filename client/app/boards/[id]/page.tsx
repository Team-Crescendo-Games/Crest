"use client";

import { useState, use } from "react";
import BoardHeader from "@/app/boards/BoardHeader";
import Board from "../BoardView";
import Table from "../TableView";
import ModalNewTask from "@/components/ModalNewTask";
import { useGetProjectsQuery, useGetTagsQuery, useGetTasksQuery } from "@/state/api";
import { FilterState, initialFilterState } from "@/lib/filterTypes";
import { isFilterActive } from "@/lib/filterUtils";

type Props = {
    params: Promise<{ id: string }>;
};

const BoardPage = ({ params }: Props) => {
    const { id } = use(params);
    const [activeTab, setActiveTab] = useState("Board");
    const [isModalNewTaskOpen, setIsModalNewTaskOpen] = useState(false);
    const [filterState, setFilterState] = useState<FilterState>(initialFilterState);
    
    const { data: projects } = useGetProjectsQuery();
    const { data: tags = [] } = useGetTagsQuery();
    const { data: tasks = [] } = useGetTasksQuery({ projectId: Number(id) });
    const project = projects?.find((p) => p.id === Number(id));
    
    const totalTasks = tasks.length;
    const totalPoints = tasks.reduce((sum, task) => sum + (task.points || 0), 0);
    
    const handleFilterChange = (newState: FilterState) => setFilterState(newState);

    return (
        <div>
            <ModalNewTask
                isOpen={isModalNewTaskOpen}
                onClose={() => setIsModalNewTaskOpen(false)}
                id={id}
            />
            <BoardHeader 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                boardName={project?.name || "Board"}
                boardDescription={project?.description}
                boardId={id}
                filterState={filterState}
                onFilterChange={handleFilterChange}
                tags={tags}
                isFilterActive={isFilterActive(filterState)}
                totalTasks={totalTasks}
                totalPoints={totalPoints}
            />
            {activeTab === "Board" && (
                <Board id={id} setIsModalNewTaskOpen={setIsModalNewTaskOpen} filterState={filterState} />
            )}
            {activeTab === "Table" && (
                <Table id={id} setIsModalNewTaskOpen={setIsModalNewTaskOpen} filterState={filterState} />
            )}
        </div>
    );
};

export default BoardPage;
