"use client";

import Header from "@/components/Header";
import TaskCard from "@/components/tasks/taskCard";
import TaskDetailModal from "@/components/tasks/taskDetailModal";
import {
  Task,
  Status,
  useGetTasksAssignedToUserQuery,
  useGetTasksAuthoredByUserQuery,
} from "@/state/api";
import { useAuthUser } from "@/lib/useAuthUser";
import { useState } from "react";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  UserCheck,
  FilePlus,
} from "lucide-react";

type TabType = "assigned" | "created";

const HomePage = () => {
  const { data: authData, isLoading: authLoading } = useAuthUser();
  const userId = authData?.userDetails?.userId;

  const { data: assignedTasks, isLoading: assignedLoading } =
    useGetTasksAssignedToUserQuery(userId!, { skip: !userId });

  const { data: authoredTasks, isLoading: authoredLoading } =
    useGetTasksAuthoredByUserQuery(userId!, { skip: !userId });

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("assigned");

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
  };

  // Filter for open tasks (not Done)
  const openAssignedTasks =
    assignedTasks?.filter((task) => task.status !== Status.Done) || [];
  const openAuthoredTasks =
    authoredTasks?.filter((task) => task.status !== Status.Done) || [];

  const currentTasks =
    activeTab === "assigned" ? openAssignedTasks : openAuthoredTasks;

  // Group by status (for assigned tasks stats)
  const todoTasks = openAssignedTasks.filter(
    (t) => t.status === Status.InputQueue,
  );
  const wipTasks = openAssignedTasks.filter(
    (t) => t.status === Status.WorkInProgress,
  );
  const reviewTasks = openAssignedTasks.filter(
    (t) => t.status === Status.Review,
  );

  const isLoading = authLoading || assignedLoading || authoredLoading;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-gray-500 dark:text-neutral-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <Header name="Overview" />

      {/* Stats Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg bg-white p-4 shadow dark:bg-dark-secondary">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-gray-100 p-2 dark:bg-dark-tertiary">
              <Clock className="h-5 w-5 text-gray-600 dark:text-neutral-300" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {todoTasks.length}
              </p>
              <p className="text-sm text-gray-500 dark:text-neutral-400">
                To Do
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-4 shadow dark:bg-dark-secondary">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/30">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {wipTasks.length}
              </p>
              <p className="text-sm text-gray-500 dark:text-neutral-400">
                In Progress
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-4 shadow dark:bg-dark-secondary">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-purple-100 p-2 dark:bg-purple-900/30">
              <CheckCircle2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {reviewTasks.length}
              </p>
              <p className="text-sm text-gray-500 dark:text-neutral-400">
                Under Review
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab("assigned")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "assigned"
              ? "border-b-2 border-gray-800 text-gray-900 dark:border-white dark:text-white"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          <UserCheck className="h-4 w-4" />
          Assigned to Me ({openAssignedTasks.length})
        </button>
        <button
          onClick={() => setActiveTab("created")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "created"
              ? "border-b-2 border-gray-800 text-gray-900 dark:border-white dark:text-white"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          <FilePlus className="h-4 w-4" />
          Created by Me ({openAuthoredTasks.length})
        </button>
      </div>

      {/* Task List */}
      <section>
        {currentTasks.length === 0 ? (
          <div className="rounded-lg bg-white p-8 text-center shadow dark:bg-dark-secondary">
            <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-green-500" />
            <p className="text-gray-600 dark:text-neutral-300">
              {activeTab === "assigned"
                ? "You're all caught up! No open tasks assigned to you."
                : "No open tasks created by you."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {currentTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => handleTaskClick(task)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Task Detail Modal */}
      <TaskDetailModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        task={selectedTask}
        tasks={currentTasks}
      />
    </div>
  );
};

export default HomePage;
