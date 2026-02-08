"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useGetTaskByIdQuery } from "@/state/api";
import TaskDetailModal from "@/components/TaskDetailModal";

type Props = {
  params: Promise<{ id: string }>;
};

const TaskPage = ({ params }: Props) => {
  const { id } = use(params);
  const router = useRouter();
  const taskId = parseInt(id, 10);
  const { data: task, isLoading, error } = useGetTaskByIdQuery(taskId, {
    skip: isNaN(taskId),
  });

  if (isNaN(taskId)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Invalid task ID</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Loading task...</p>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Task not found</p>
      </div>
    );
  }

  const handleClose = () => {
    // Redirect to the board this task belongs to
    if (task.projectId) {
      router.push(`/boards/${task.projectId}`);
    } else {
      router.push("/");
    }
  };

  return (
    <TaskDetailModal
      isOpen={true}
      onClose={handleClose}
      task={task}
      onTaskNavigate={(taskId) => router.push(`/tasks/${taskId}`)}
    />
  );
};

export default TaskPage;
