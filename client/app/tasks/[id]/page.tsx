"use client";

import { use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useGetTaskByIdQuery } from "@/state/api";
import TaskDetailModal from "@/components/tasks/taskDetailModal";

type Props = {
  params: Promise<{ id: string }>;
};

const TaskPage = ({ params }: Props) => {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl");
  const taskId = parseInt(id, 10);
  const {
    data: task,
    isLoading,
    error,
  } = useGetTaskByIdQuery(taskId, {
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
    if (returnUrl) {
      router.push(returnUrl);
    } else if (task.projectId) {
      router.push(`/boards/${task.projectId}`);
    } else {
      router.push("/");
    }
  };

  const handleTaskNavigate = (newTaskId: number) => {
    // Preserve returnUrl when navigating between tasks
    const url = returnUrl
      ? `/tasks/${newTaskId}?returnUrl=${encodeURIComponent(returnUrl)}`
      : `/tasks/${newTaskId}`;
    router.push(url);
  };

  return (
    <TaskDetailModal
      isOpen={true}
      onClose={handleClose}
      task={task}
      onTaskNavigate={handleTaskNavigate}
    />
  );
};

export default TaskPage;
