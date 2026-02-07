"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useGetSprintQuery, useGetTagsQuery } from "@/state/api";
import { FilterState, initialFilterState } from "@/lib/filterTypes";
import { isFilterActive } from "@/lib/filterUtils";
import SprintHeader from "@/app/sprints/SprintHeader";
import BoardView from "@/app/sprints/BoardView";
import TableView from "@/app/sprints/TableView";
import ModalNewTask from "@/components/ModalNewTask";

const SprintPage = () => {
    const params = useParams();
    const sprintId = Number(params.id);
    
    const [activeTab, setActiveTab] = useState<"Board" | "Table">("Board");
    const [isModalNewTaskOpen, setIsModalNewTaskOpen] = useState(false);
    const [filterState, setFilterState] = useState<FilterState>(initialFilterState);
    
    const { data: sprint, isLoading, error } = useGetSprintQuery(sprintId);
    const { data: tags = [] } = useGetTagsQuery();
    
    const sprintTasks = sprint?.tasks || [];
    const totalTasks = sprintTasks.length;
    const totalPoints = sprintTasks.reduce((sum, task) => sum + (task.points || 0), 0);
    
    const handleFilterChange = (newState: FilterState) => setFilterState(newState);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full p-8">
                <div className="text-gray-500 dark:text-gray-400">Loading sprint...</div>
            </div>
        );
    }

    if (error || !sprint) {
        return (
            <div className="flex items-center justify-center h-full p-8">
                <div className="text-red-500">
                    {error ? "Error loading sprint" : "Sprint not found"}
                </div>
            </div>
        );
    }

    return (
        <div>
            <ModalNewTask
                isOpen={isModalNewTaskOpen}
                onClose={() => setIsModalNewTaskOpen(false)}
            />
            <SprintHeader
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                sprintTitle={sprint.title}
                sprintStartDate={sprint.startDate}
                sprintDueDate={sprint.dueDate}
                sprintId={sprintId}
                filterState={filterState}
                onFilterChange={handleFilterChange}
                tags={tags}
                isFilterActive={isFilterActive(filterState)}
                totalTasks={totalTasks}
                totalPoints={totalPoints}
            />
            {activeTab === "Board" && (
                <BoardView
                    sprintId={sprintId}
                    tasks={sprint.tasks || []}
                    setIsModalNewTaskOpen={setIsModalNewTaskOpen}
                    filterState={filterState}
                />
            )}
            {activeTab === "Table" && (
                <TableView
                    sprintId={sprintId}
                    tasks={sprint.tasks || []}
                    setIsModalNewTaskOpen={setIsModalNewTaskOpen}
                    filterState={filterState}
                />
            )}
        </div>
    );
};

export default SprintPage;
