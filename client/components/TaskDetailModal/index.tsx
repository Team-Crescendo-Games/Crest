"use client";

import { useState, useEffect } from "react";
import Modal from "../Modal";
import SubtaskHierarchy from "@/components/SubtaskHierarchy";
import { Task, Priority, Status, useUpdateTaskMutation, useGetUsersQuery, useGetTagsQuery, useCreateCommentMutation, useGetAuthUserQuery, getAttachmentS3Key, getUserProfileS3Key } from "@/state/api";
import { format } from "date-fns";
import { Calendar, MessageSquareMore, User, Users, Tag, Award, Pencil, X, Plus, Paperclip } from "lucide-react";
import S3Image from "@/components/S3Image";

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
              : "bg-gray-200 text-gray-700 dark:bg-dark-tertiary dark:text-gray-200"
    }`}
  >
    {priority}
  </div>
);

const StatusBadge = ({ status }: { status: Task["status"] }) => {
  const statusColor: Record<string, string> = {
    "Input Queue": "bg-[#7f97cb] text-white",
    "Work In Progress": "bg-[#65d6b3] text-white",
    "Review": "bg-[#d1ac1e] text-white",
    "Done": "bg-[#31aa00] text-white",
  };

  return (
    <span
      className={`rounded-full px-2 py-1 text-xs font-semibold ${
        statusColor[status || ""] || "bg-gray-200 text-gray-700 dark:bg-dark-tertiary dark:text-gray-200"
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
  const [createComment, { isLoading: isAddingComment }] = useCreateCommentMutation();
  const { data: users } = useGetUsersQuery();
  const { data: allTags } = useGetTagsQuery();
  const { data: authData } = useGetAuthUserQuery({});
  const [previewAttachmentId, setPreviewAttachmentId] = useState<number | null>(null);
  const [newComment, setNewComment] = useState("");

  // Edit form state
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editPriority, setEditPriority] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editPoints, setEditPoints] = useState("");
  const [editAssignedUserId, setEditAssignedUserId] = useState("");
  const [editTagIds, setEditTagIds] = useState<number[]>([]);
  const [editSubtaskIds, setEditSubtaskIds] = useState<number[]>([]);

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
    setEditTagIds(currentTask.taskTags?.map((tt) => tt.tag.id) || []);
    setEditSubtaskIds(currentTask.subtasks?.map((s) => s.id) || []);
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
      tagIds: editTagIds,
      subtaskIds: editSubtaskIds,
    }).unwrap();
    setIsEditing(false);
    setSaveMessage(true);
    setTimeout(() => setSaveMessage(false), 2000);
  };

  const handleTagToggle = (tagId: number) => {
    setEditTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleSubtaskToggle = (subtaskId: number) => {
    setEditSubtaskIds((prev) =>
      prev.includes(subtaskId) ? prev.filter((id) => id !== subtaskId) : [...prev, subtaskId]
    );
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
      name={currentTask.title}
      hideClose={isEditing}
      hideHeader={isEditing}
      headerRight={
        <div className="flex items-center gap-2">
          {currentTask.priority && <PriorityTag priority={currentTask.priority} />}
          <button
            onClick={handleEditClick}
            className="flex h-7 w-7 items-center justify-center rounded text-gray-600 hover:bg-gray-100 dark:text-neutral-300 dark:hover:bg-dark-tertiary"
            title="Edit task"
          >
            <Pencil size={16} />
          </button>
        </div>
      }
      rightPanel={
        !isEditing ? (
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3 dark:border-stroke-dark">
              <MessageSquareMore className="h-4 w-4 text-gray-600 dark:text-neutral-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {numberOfComments} {numberOfComments === 1 ? "comment" : "comments"}
              </span>
            </div>
            
            {/* Comments list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {currentTask.comments && currentTask.comments.length > 0 ? (
                currentTask.comments.map((comment) => (
                  <div key={comment.id} className="group">
                    <div className="flex gap-2">
                      {comment.user?.profilePictureExt && comment.user?.userId ? (
                        <S3Image
                          s3Key={getUserProfileS3Key(comment.user.userId, comment.user.profilePictureExt)}
                          alt={comment.user.username}
                          width={28}
                          height={28}
                          className="h-7 w-7 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500 text-white text-xs font-medium flex-shrink-0">
                          {comment.user?.username?.charAt(0).toUpperCase() || "?"}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs font-medium text-gray-900 dark:text-white">
                            {comment.user?.username || "Unknown"}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-neutral-300 mt-0.5 break-words">
                          {comment.text}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <MessageSquareMore className="h-8 w-8 text-gray-300 dark:text-gray-600 mb-2" />
                  <p className="text-sm text-gray-500 dark:text-neutral-400">No comments yet</p>
                  <p className="text-xs text-gray-400 dark:text-neutral-500 mt-1">Be the first to comment</p>
                </div>
              )}
            </div>
            
            {/* Add comment input - Google style */}
            <div className="border-t border-gray-200 p-3 dark:border-stroke-dark">
              <div className="flex gap-2">
                {authData?.userDetails?.profilePictureExt && authData?.userDetails?.userId ? (
                  <S3Image
                    s3Key={getUserProfileS3Key(authData.userDetails.userId, authData.userDetails.profilePictureExt)}
                    alt="You"
                    width={28}
                    height={28}
                    className="h-7 w-7 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-400 text-white text-xs font-medium flex-shrink-0">
                    {authData?.userDetails?.username?.charAt(0).toUpperCase() || "?"}
                  </div>
                )}
                <div className="flex-1">
                  <input
                    type="text"
                    className="w-full rounded-full border border-gray-300 bg-white px-3 py-1.5 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-dark-secondary dark:text-white dark:placeholder-gray-500"
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newComment.trim() && authData?.userDetails?.userId && typeof authData.userDetails.userId === 'number') {
                        createComment({
                          taskId: currentTask.id,
                          userId: authData.userDetails.userId,
                          text: newComment.trim(),
                        });
                        setNewComment("");
                      }
                    }}
                  />
                  {newComment.trim() && (
                    <div className="mt-2 flex justify-end gap-2">
                      <button
                        onClick={() => setNewComment("")}
                        className="rounded px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          if (newComment.trim() && authData?.userDetails?.userId && typeof authData.userDetails.userId === 'number') {
                            createComment({
                              taskId: currentTask.id,
                              userId: authData.userDetails.userId,
                              text: newComment.trim(),
                            });
                            setNewComment("");
                          }
                        }}
                        disabled={isAddingComment || !authData?.userDetails?.userId || typeof authData?.userDetails?.userId !== 'number'}
                        className="rounded bg-blue-500 px-3 py-1 text-xs text-white hover:bg-blue-600 disabled:opacity-50"
                      >
                        Comment
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : undefined
      }
    >
      <div className="space-y-6 dark:text-white">
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

          {/* Start Date & Due Date */}
          <div className="col-span-1 md:col-span-2 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500 dark:text-neutral-500" />
              <span className="text-sm text-gray-600 dark:text-neutral-400">Start:</span>
              {isEditing ? (
                <input type="date" className={selectClass} value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)} />
              ) : (
                <span className="text-sm text-gray-900 dark:text-white">{formattedStartDate}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500 dark:text-neutral-500" />
              <span className="text-sm text-gray-600 dark:text-neutral-400">Due:</span>
              {isEditing ? (
                <input type="date" className={selectClass} value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} />
              ) : (
                <span className="text-sm text-gray-900 dark:text-white">{formattedDueDate}</span>
              )}
            </div>
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
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Tag className="h-4 w-4 text-gray-500 dark:text-neutral-500" />
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Tags</h3>
          </div>
          {isEditing ? (
            <div className="flex flex-wrap gap-2">
              {allTags?.map((tag) => {
                const isSelected = editTagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleTagToggle(tag.id)}
                    className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                      isSelected
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-dark-tertiary dark:text-gray-300 dark:hover:bg-gray-600"
                    }`}
                  >
                    {tag.name}
                    {isSelected && <X size={12} />}
                  </button>
                );
              })}
              {(!allTags || allTags.length === 0) && (
                <span className="text-sm text-gray-500 dark:text-neutral-400">No tags available</span>
              )}
            </div>
          ) : tags.length > 0 ? (
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
          ) : (
            <span className="text-sm text-gray-500 dark:text-neutral-400">No tags</span>
          )}
        </div>

        {/* Subtasks Management (edit mode only) */}
        {isEditing && tasks && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-gray-500 dark:text-neutral-500" />
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Subtasks</h3>
              </div>
              <span className="text-xs text-gray-500 dark:text-neutral-400">
                Click to add/remove
              </span>
            </div>
            <div className="space-y-2">
              {/* Show currently selected subtasks first */}
              {editSubtaskIds.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Current Subtasks:</p>
                  {tasks
                    .filter((t) => editSubtaskIds.includes(t.id))
                    .map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => handleSubtaskToggle(task.id)}
                        className="flex w-full items-center justify-between rounded-lg border border-blue-500 bg-blue-50 px-3 py-2 text-left text-sm transition-colors hover:bg-blue-100 dark:border-blue-400 dark:bg-blue-900/30 dark:hover:bg-blue-900/50"
                      >
                        <span className="font-medium dark:text-white">{task.title}</span>
                        <X size={16} className="text-blue-500 dark:text-blue-400" />
                      </button>
                    ))}
                </div>
              )}
              {/* Show available tasks to add as subtasks */}
              {tasks.filter((t) => t.id !== currentTask.id && t.id !== currentTask.parentTask?.id && !t.parentTask && t.projectId === currentTask.projectId && !editSubtaskIds.includes(t.id)).length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Available Tasks:</p>
                  {tasks
                    .filter((t) => t.id !== currentTask.id && t.id !== currentTask.parentTask?.id && !t.parentTask && t.projectId === currentTask.projectId && !editSubtaskIds.includes(t.id))
                    .map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => handleSubtaskToggle(task.id)}
                        className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50 dark:border-stroke-dark dark:bg-dark-tertiary dark:hover:bg-gray-700"
                      >
                        <span className="font-medium dark:text-white">{task.title}</span>
                        <Plus size={16} className="text-gray-400" />
                      </button>
                    ))}
                </div>
              )}
              {tasks.filter((t) => t.id !== currentTask.id && t.id !== currentTask.parentTask?.id && !t.parentTask && t.projectId === currentTask.projectId).length === 0 && (
                <span className="text-sm text-gray-500 dark:text-neutral-400">No available tasks to add as subtasks</span>
              )}
            </div>
          </div>
        )}

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
              Back
            </button>
          </div>
        )}

        {/* Subtask Hierarchy — visible in view mode only */}
        {!isEditing && hasHierarchy && (
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
                  {currentTask.author?.profilePictureExt && currentTask.author?.userId ? (
                    <S3Image
                      s3Key={getUserProfileS3Key(currentTask.author.userId, currentTask.author.profilePictureExt)}
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
                  {currentTask.assignee?.profilePictureExt && currentTask.assignee?.userId ? (
                    <S3Image
                      s3Key={getUserProfileS3Key(currentTask.assignee.userId, currentTask.assignee.profilePictureExt)}
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
            <div className="mb-3 flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-gray-500 dark:text-neutral-500" />
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Attachments ({currentTask.attachments.length})
              </h3>
            </div>
            <div className="space-y-2">
              {currentTask.attachments.map((attachment) => (
                <div key={attachment.id} className="rounded-lg border border-gray-200 dark:border-stroke-dark">
                  <div className="flex items-center justify-between bg-gray-50 px-3 py-2 dark:bg-dark-tertiary">
                    <p className="truncate text-sm text-gray-700 dark:text-neutral-300">
                      {attachment.fileName}
                    </p>
                    <button
                      onClick={() => setPreviewAttachmentId(previewAttachmentId === attachment.id ? null : attachment.id)}
                      className="ml-2 rounded bg-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
                    >
                      {previewAttachmentId === attachment.id ? "Hide" : "Preview"}
                    </button>
                  </div>
                  {previewAttachmentId === attachment.id && (
                    <div className="p-2">
                      <S3Image
                        s3Key={getAttachmentS3Key(attachment.taskId, attachment.id, attachment.fileExt)}
                        alt={attachment.fileName}
                        width={600}
                        height={400}
                        className="h-auto w-full rounded object-contain"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default TaskDetailModal;