"use client";

import { use, useState } from "react";
import { useGetUserByIdQuery, useGetTasksByUserQuery, Task } from "@/state/api";
import Header from "@/components/Header";
import S3Image from "@/components/S3Image";
import TaskCard from "@/components/TaskCard";
import TaskDetailModal from "@/components/TaskDetailModal";
import { User as UserIcon, Mail, ArrowLeft } from "lucide-react";
import Link from "next/link";

type Props = {
    params: Promise<{ id: string }>;
};

const UserProfilePage = ({ params }: Props) => {
    const { id } = use(params);
    const userId = Number(id);
    
    const { data: user, isLoading, isError } = useGetUserByIdQuery(userId);
    const { data: tasks } = useGetTasksByUserQuery(userId);

    const [isTaskDetailModalOpen, setIsTaskDetailModalOpen] = useState(false);
    const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

    const assignedTasks = tasks || [];
    const totalPoints = assignedTasks.reduce((sum, task) => sum + (task.points || 0), 0);
    const selectedTask = assignedTasks.find((t) => t.id === selectedTaskId) || null;

    const handleTaskClick = (task: Task) => {
        setSelectedTaskId(task.id);
        setIsTaskDetailModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsTaskDetailModalOpen(false);
        setSelectedTaskId(null);
    };

    if (isLoading) return <div className="p-8">Loading...</div>;
    if (isError || !user) return <div className="p-8">User not found</div>;

    return (
        <div className="flex w-full flex-col p-8">
            <Link 
                href="/users" 
                className="mb-4 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-neutral-400 dark:hover:text-neutral-200"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Users
            </Link>
            
            <div className="mb-8 flex items-start gap-6">
                {user.userId && user.profilePictureExt ? (
                    <S3Image
                        s3Key={`users/${user.userId}/profile.${user.profilePictureExt}`}
                        alt={user.username}
                        width={120}
                        height={120}
                        className="h-24 w-24 rounded-full object-cover"
                    />
                ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gray-100 dark:bg-dark-tertiary">
                        <UserIcon className="h-12 w-12 text-gray-500 dark:text-neutral-400" />
                    </div>
                )}
                <div>
                    <Header name={user.username} />
                    {user.email && (
                        <div className="flex items-center gap-2 text-gray-500 dark:text-neutral-400">
                            <Mail className="h-4 w-4" />
                            <span>{user.email}</span>
                        </div>
                    )}
                </div>
            </div>

            <div>
                <h2 className="mb-4 text-lg font-semibold dark:text-white">
                    Assigned Tasks ({assignedTasks.length} tasks, {totalPoints} points)
                </h2>
                {assignedTasks.length === 0 ? (
                    <p className="text-gray-500 dark:text-neutral-400">No tasks assigned</p>
                ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {assignedTasks.map((task) => (
                            <TaskCard 
                                key={task.id} 
                                task={task} 
                                onClick={() => handleTaskClick(task)}
                            />
                        ))}
                    </div>
                )}
            </div>

            <TaskDetailModal
                isOpen={isTaskDetailModalOpen}
                onClose={handleCloseModal}
                task={selectedTask}
                tasks={assignedTasks}
            />
        </div>
    );
};

export default UserProfilePage;
