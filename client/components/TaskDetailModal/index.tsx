"use client";

import { useState, useEffect } from "react";
import Modal from "../Modal";
import SubtaskHierarchy from "@/components/SubtaskHierarchy";
import { Task, Priority, Status, useUpdateTaskMutation, useGetUsersQuery } from "@/state/api";
import { format } from "date-fns";
import { Calendar, MessageSquareMore, User, Users, Tag, Award, Pencil } from "lucide-react";
import Image from "next/image";

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  tasks?: Task[];
}

const PriorityTag = ({ priority }: { priority: Task["priority"] }) => (
  <div
    className={`rounded-full px-2 py-1 text-xs font-semibold ${
      priority === "Urgent"
        ? "bg-red-200 text-red-700 dark:bg-red-900 dark:text-red-200"
        : priority === "High"
          ? "bg-yellow-200 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200"
          : priority === "Medium"
            ? "bg-green-200 text-green-700 dark:bg-green-900 dark:text-green-200"
            : priority === "Low"
              ? "bg-blue-200 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
              : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200"
    }`}
  >
    {priority}
  </div>
);

const StatusBadge = ({ status }: { status: Task["status"] }) => {
  const statusColor: Record<string, string> = {
    "To Do": "bg-[#7f97cb] text-white",
    "Work In Progress": "bg-[#65d6b3] text-white",
    "Under Review": "bg-[#d1ac1e] text-white",
    Completed: "bg-[#31aa00] text-white",
  };

  return (
    <span
      className={`rounded-full px-2 py-1 text-xs font-semibold ${
        statusColor[status || ""] || "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200"
      }`}
    >
      {status}
    </span>
  );
};

const TaskDetailModal = ({ isOpen, onClose, task, tasks }: TaskDetailModalProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [displayedTaskId, setDisplayedTaskId] = useState<number | null>(null);
  const [saveMessage, setSaveMessage] = useState(false);
  const [updateTask, { isLoading: isUpdating }] = useUpdateTaskMutation();
  const { data: users } = useGetUsersQuery();

  // Edit form state
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editPriority, setEditPriority] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editPoints, setEditPoints] = useState("");
  const [editAssignedUserId, setEditAssignedUserId] = useState("");

  // Sync displayedTaskId and reset edit mode when the modal opens with a new task
  useEffect(() => {
    if (task) {
      setDisplayedTaskId(task.id);
      setIsEditing(false);
    }
  }, [task]);

  // Reset edit mode when navigating to a different task
  const handleTaskNavigation = (taskId: number) => {
    setDisplayedTaskId(taskId);
    setIsEditing(false);
  };

  if (!task) return null;

  // Look up the currently displayed task from the tasks list, falling back to the original task prop
  const currentTask =
    displayedTaskId && tasks
      ? tasks.find((t) => t.id === displayedTaskId) ?? task
      : task;

  const tags = currentTask.taskTags?.map((tt) => tt.tag.name) || [];

  const hasHierarchy =
    (currentTask.parentTask != null) ||
    (currentTask.subtasks != null && currentTask.subtasks.length > 0);

  const formattedStartDate = currentTask.startDate
    ? format(new Date(currentTask.startDate), "PPP")
    : "Not set";
  const formattedDueDate = currentTask.dueDate
    ? format(new Date(currentTask.dueDate), "PPP")
    : "Not set";

  const numberOfComments = (currentTask.comments && currentTask.comments.length) || 0;

  const handleEditClick = () => {
    setEditTitle(currentTask.title);
    setEditDescription(currentTask.description || "");
    setEditStatus(currentTask.status || "");
    setEditPriority(currentTask.priority || "");
    setEditStartDate(currentTask.startDate ? new Date(currentTask.startDate).toISOString().split("T")[0] : "");
    setEditDueDate(currentTask.dueDate ? new Date(currentTask.dueDate).toISOString().split("T")[0] : "");
    setEditPoints(currentTask.points?.toString() || "");
    setEditAssignedUserId(currentTask.assignedUserId?.toString() || "");
    setIsEditing(true);
  };

  const handleSave = async () => {
    await updateTask({
      id: currentTask.id,
      title: editTitle,
      description: editDescription,
      status: editStatus as Status,
      priority: editPriority as Priority,
      startDate: editStartDate || undefined,
      dueDate: editDueDate || undefined,
      points: editPoints ? Number(editPoints) : undefined,
      assignedUserId: editAssignedUserId ? Number(editAssignedUserId) : undefined,
    }).unwrap();
    setIsEditing(false);
    setSaveMessage(true);
    setTimeout(() => setSaveMessage(false), 2000);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const inputClass =
    "w-full rounded border border-gray-300 p-2 text-sm dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white";
  const selectClass =
    "rounded border border-gray-300 p-2 text-sm dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      name={isEditing ? "" : currentTask.title}
      hideClose={isEditing}
      headerRight={
        <div className="flex items-center gap-2">
          {!isEditing && currentTask.priority && <PriorityTag priority={currentTask.priority} />}
          {!isEditing && (
            <button
              onClick={handleEditClick}
              className="flex h-7 w-7 items-center justify-center rounded text-gray-600 hover:bg-gray-100 dark:text-neutral-300 dark:hover:bg-gray-700"
              title="Edit task"
            >
              <Pencil size={16} />
            </button>
          )}
        </div>
      }
    >
      <div className="mt-4 space-y-6 dark:text-white">
        {/* Save success message */}
        {saveMessage && (
          <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-300">
            Task saved successfully
          </div>
        )}
        {/* Title edit input (only in edit mode) */}
        {isEditing && (
          <input
            className={inputClass}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Task title"
          />
        )}

        {/* Description */}
        <div>
          {isEditing ? (
            <textarea
              className={`${inputClass} min-h-[80px]`}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={3}
            />
          ) : (
            <p className="text-gray-600 dark:text-neutral-400">
              {currentTask.description || "No description provided"}
            </p>
          )}
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Status */}
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-gray-500 dark:text-neutral-500" />
            {isEditing ? (
              <select className={selectClass} value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                <option value="">Select Status</option>
                {Object.values(Status).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            ) : (
              currentTask.status && <StatusBadge status={currentTask.status} />
            )}
          </div>

          {/* Priority */}
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-gray-500 dark:text-neutral-500" />
              <span className="text-sm text-gray-600 dark:text-neutral-400">Priority:</span>
              <select className={selectClass} value={editPriority} onChange={(e) => setEditPriority(e.target.value)}>
                <option value="">Select Priority</option>
                {Object.values(Priority).map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          ) : (
            typeof currentTask.points === "number" && (
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-gray-500 dark:text-neutral-500" />
                <span className="text-sm text-gray-600 dark:text-neutral-400">Points:</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {currentTask.points} pts
                </span>
              </div>
            )
          )}

          {/* Points (edit mode) */}
          {isEditing && (
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-gray-500 dark:text-neutral-500" />
              <span className="text-sm text-gray-600 dark:text-neutral-400">Points:</span>
              <input
                type="number"
                className={`${selectClass} w-20`}
                value={editPoints}
                onChange={(e) => setEditPoints(e.target.value)}
              />
            </div>
          )}

          {/* Start Date */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500 dark:text-neutral-500" />
            <span className="text-sm text-gray-600 dark:text-neutral-400">Start Date:</span>
            {isEditing ? (
              <input type="date" className={selectClass} value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)} />
            ) : (
              <span className="text-sm text-gray-900 dark:text-white">{formattedStartDate}</span>
            )}
          </div>

          {/* Due Date */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500 dark:text-neutral-500" />
            <span className="text-sm text-gray-600 dark:text-neutral-400">Due Date:</span>
            {isEditing ? (
              <input type="date" className={selectClass} value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} />
            ) : (
              <span className="text-sm text-gray-900 dark:text-white">{formattedDueDate}</span>
            )}
          </div>

          {/* Assignee (edit mode) */}
          {isEditing && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-500 dark:text-neutral-500" />
              <span className="text-sm text-gray-600 dark:text-neutral-400">Assignee:</span>
              <select className={selectClass} value={editAssignedUserId} onChange={(e) => setEditAssignedUserId(e.target.value)}>
                <option value="">Unassigned</option>
                {users?.map((u) => (
                  <option key={u.userId} value={u.userId}>{u.username}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Save / Cancel buttons */}
        {isEditing && (
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={isUpdating}
              className="rounded bg-gray-800 px-4 py-2 text-sm text-white hover:bg-gray-700 disabled:opacity-50 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-200"
            >
              {isUpdating ? "Saving..." : "Save"}
            </button>
            <button
              onClick={handleCancel}
              className="rounded bg-gray-200 px-4 py-2 text-sm dark:bg-dark-tertiary dark:text-white"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Tags */}
        {!isEditing && tags.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Tag className="h-4 w-4 text-gray-500 dark:text-neutral-500" />
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Tags</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Subtask Hierarchy — visible in both view and edit modes */}
        {hasHierarchy && (
          <div className="border-t border-gray-200 pt-4 dark:border-stroke-dark">
            <SubtaskHierarchy
              parentTask={currentTask.parentTask}
              subtasks={currentTask.subtasks}
              onTaskClick={handleTaskNavigation}
            />
          </div>
        )}

        {/* People Section */}
        {!isEditing && (
          <div className="border-t border-gray-200 pt-4 dark:border-stroke-dark">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500 dark:text-neutral-500" />
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Author</h3>
                </div>
                <div className="flex items-center gap-2">
                  {currentTask.author?.profilePictureUrl ? (
                    <Image
                      src={`https://ninghuax-tm-demo-bucket-us-west-2.s3.us-east-1.amazonaws.com/${currentTask.author.profilePictureUrl}`}
                      alt={currentTask.author.username}
                      width={32}
                      height={32}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 dark:bg-dark-tertiary">
                      <User className="h-4 w-4 text-gray-500 dark:text-neutral-500" />
                    </div>
                  )}
                  <span className="text-sm text-gray-900 dark:text-white">
                    {currentTask.author?.username || "Unknown"}
                  </span>
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-500 dark:text-neutral-500" />
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Assignee</h3>
                </div>
                <div className="flex items-center gap-2">
                  {currentTask.assignee?.profilePictureUrl ? (
                    <Image
                      src={`https://ninghuax-tm-demo-bucket-us-west-2.s3.us-east-1.amazonaws.com/${currentTask.assignee.profilePictureUrl}`}
                      alt={currentTask.assignee.username}
                      width={32}
                      height={32}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 dark:bg-dark-tertiary">
                      <Users className="h-4 w-4 text-gray-500 dark:text-neutral-500" />
                    </div>
                  )}
                  <span className="text-sm text-gray-900 dark:text-white">
                    {currentTask.assignee?.username || "Unassigned"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Attachments */}
        {!isEditing && currentTask.attachments && currentTask.attachments.length > 0 && (
          <div className="border-t border-gray-200 pt-4 dark:border-stroke-dark">
            <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
              Attachments ({currentTask.attachments.length})
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {currentTask.attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="overflow-hidden rounded-lg border border-gray-200 dark:border-stroke-dark"
                >
                  <Image
                    src={`https://ninghuax-tm-demo-bucket-us-west-2.s3.us-east-1.amazonaws.com/${attachment.fileURL}`}
                    alt={attachment.fileName}
                    width={400}
                    height={200}
                    className="h-auto w-full object-cover"
                  />
                  <div className="bg-gray-50 px-3 py-2 dark:bg-dark-tertiary">
                    <p className="truncate text-xs text-gray-600 dark:text-neutral-400">
                      {attachment.fileName}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comments */}
        <div className="flex items-center gap-2 border-t border-gray-200 pt-4 dark:border-stroke-dark">
          <MessageSquareMore className="h-4 w-4 text-gray-500 dark:text-neutral-500" />
          <span className="text-sm text-gray-600 dark:text-neutral-400">
            {numberOfComments} {numberOfComments === 1 ? "comment" : "comments"}
          </span>
        </div>
      </div>
    </Modal>
  );
};

export default TaskDetailModal;