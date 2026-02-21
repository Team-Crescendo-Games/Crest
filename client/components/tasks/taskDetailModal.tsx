"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Modal from "../Modal";
import SubtaskHierarchy from "@/components/SubtaskHierarchy";
import ActivityList from "@/components/ActivityList";
import CollapsibleSection from "@/components/CollapsibleSection";
import CommentsPanel from "@/components/CommentsPanel";
import TaskDetailsEditModal from "@/components/tasks/taskDetailsEditModal";
import {
  Task,
  useDeleteTaskMutation,
  useCreateTaskMutation,
  useGetUsersQuery,
  useGetBoardsQuery,
  getAttachmentS3Key,
} from "@/state/api";
import { useAuthUser } from "@/lib/useAuthUser";
import { useWorkspace } from "@/lib/useWorkspace";
import { PRIORITY_BADGE_STYLES } from "@/lib/priorityColors";
import { STATUS_BADGE_STYLES } from "@/lib/statusColors";
import { format } from "date-fns";
import {
  Calendar,
  User,
  Users,
  Tag,
  Award,
  Pencil,
  X,
  Zap,
  Flag,
  Trash2,
  Copy,
  Check,
  Link2,
  Download,
} from "lucide-react";
import { isTextFile, isImageFile } from "@/lib/attachmentUtils";
import UserIcon from "@/components/UserIcon";
import AssigneeAvatarGroup from "@/components/AssigneeAvatarGroup";
import S3Image from "@/components/S3Image";
import { BiColumns } from "react-icons/bi";
import ConfirmationMenu from "@/components/ConfirmationMenu";
import Markdown from "react-markdown";

// Floating action button component
type FloatingButtonVariant = "default" | "success" | "danger";

type TaskDetailsFloatingButtonProps = {
  icon: React.ReactNode;
  onClick: () => void;
  title: string;
  variant?: FloatingButtonVariant;
  disabled?: boolean;
  active?: boolean;
};

const TaskDetailsFloatingButton = ({
  icon,
  onClick,
  title,
  variant = "default",
  disabled = false,
  active = false,
}: TaskDetailsFloatingButtonProps) => {
  const baseClasses =
    "flex h-9 w-9 items-center justify-center rounded-full shadow-lg transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:hover:scale-100";

  const variantClasses: Record<FloatingButtonVariant, string> = {
    default:
      "bg-white text-gray-600 hover:bg-gray-100 dark:bg-dark-secondary dark:text-neutral-300 dark:hover:bg-dark-tertiary",
    success: "bg-green-500 text-white hover:bg-green-600",
    danger:
      "bg-white text-red-500 hover:bg-red-50 dark:bg-dark-secondary dark:hover:bg-red-900/20",
  };

  const activeClasses = active
    ? "bg-green-500 text-white"
    : variantClasses[variant];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${activeClasses}`}
      title={title}
    >
      {icon}
    </button>
  );
};

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  tasks?: Task[];
  onTaskNavigate?: (taskId: number) => void;
}

const PriorityTag = ({ priority }: { priority: Task["priority"] }) => {
  const styles = priority
    ? PRIORITY_BADGE_STYLES[priority]
    : PRIORITY_BADGE_STYLES.Backlog;
  return (
    <div
      className={`rounded-full px-2 py-1 text-xs font-semibold ${styles.bg} ${styles.text} ${styles.darkBg} ${styles.darkText}`}
    >
      {priority}
    </div>
  );
};

const StatusBadge = ({ status }: { status: Task["status"] }) => {
  const styles = status
    ? STATUS_BADGE_STYLES[status]
    : STATUS_BADGE_STYLES["Input Queue"];
  return (
    <span
      className={`rounded-full px-2 py-1 text-xs font-semibold ${styles.bg} ${styles.text} ${styles.darkBg} ${styles.darkText}`}
    >
      {status}
    </span>
  );
};

const TaskDetailModal = ({
  isOpen,
  onClose,
  task,
  tasks,
  onTaskNavigate,
}: TaskDetailModalProps) => {
  const { activeWorkspaceId } = useWorkspace();

  const [isEditing, setIsEditing] = useState(false);
  const [displayedTaskId, setDisplayedTaskId] = useState<number | null>(null);
  const [localTaskOverride, setLocalTaskOverride] = useState<Task | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);

  const [deleteTask, { isLoading: isDeleting }] = useDeleteTaskMutation();
  const [createTask, { isLoading: isDuplicating }] = useCreateTaskMutation();

  const { data: users } = useGetUsersQuery();
  const { data: boards } = useGetBoardsQuery(activeWorkspaceId!, {
    skip: !activeWorkspaceId,
  });
  const { data: authData } = useAuthUser();

  // Attachment preview state
  const [previewAttachmentId, setPreviewAttachmentId] = useState<number | null>(
    null,
  );
  const [textPreviewContent, setTextPreviewContent] = useState<string | null>(
    null,
  );
  const [textPreviewLoading, setTextPreviewLoading] = useState(false);
  const [textPreviewError, setTextPreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (task) {
      setDisplayedTaskId(task.id);
      setLocalTaskOverride(null);
      setIsEditing(false);
    }
  }, [task]);

  useEffect(() => {
    setPreviewAttachmentId(null);
    setTextPreviewContent(null);
  }, [displayedTaskId]);

  const handleTaskNavigation = (taskId: number) => {
    if (onTaskNavigate) {
      onTaskNavigate(taskId);
    } else {
      setDisplayedTaskId(taskId);
    }
  };

  if (!task) return null;

  const baseTask =
    displayedTaskId && tasks
      ? (tasks.find((t) => t.id === displayedTaskId) ?? task)
      : task;

  const currentTask =
    localTaskOverride && localTaskOverride.id === baseTask.id
      ? localTaskOverride
      : baseTask;

  const tags = currentTask.taskTags?.map((tt) => tt.tag.name) || [];
  const hasHierarchy =
    currentTask.parentTask != null ||
    (currentTask.subtasks != null && currentTask.subtasks.length > 0);

  const formattedStartDate = currentTask.startDate
    ? format(new Date(currentTask.startDate), "MM/dd/yyyy")
    : "Not set";
  const formattedDueDate = currentTask.dueDate
    ? format(new Date(currentTask.dueDate), "MM/dd/yyyy")
    : "Not set";

  const handleEditClick = () => setIsEditing(true);

  const handleEditSave = (updatedTask: Task) => {
    setLocalTaskOverride(updatedTask);
    setIsEditing(false);
  };

  const handleDuplicate = async () => {
    const authorId = authData?.userDetails?.userId ?? currentTask.authorUserId;
    if (!authorId) {
      console.error("Failed to duplicate task: No author user ID available");
      return;
    }

    const title = newTaskTitle.trim() || `${currentTask.title} (Copy)`;

    try {
      await createTask({
        title,
        description: currentTask.description || undefined,
        status: currentTask.status || undefined,
        priority: currentTask.priority || undefined,
        startDate: currentTask.startDate || undefined,
        dueDate: currentTask.dueDate || undefined,
        points: currentTask.points ?? undefined,
        boardId: currentTask.boardId,
        authorUserId: authorId,
        tagIds: currentTask.taskTags?.map((tt) => tt.tag.id),
        sprintIds: currentTask.sprints?.map((s) => s.id),
        assigneeIds: currentTask.taskAssignments?.map((ta) => ta.user.userId),
      }).unwrap();
      setNewTaskTitle("");
      onClose();
    } catch (error) {
      console.error("Failed to duplicate task:", error);
    }
  };

  const handleCopyLink = () => {
    const taskUrl = `${window.location.origin}/tasks/${currentTask.id}`;
    navigator.clipboard.writeText(taskUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleDownloadAttachment = async (attachment: {
    id: number;
    taskId: number;
    fileName: string;
    fileExt: string;
  }) => {
    try {
      const s3Key = getAttachmentS3Key(
        attachment.taskId,
        attachment.id,
        attachment.fileExt,
      );
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
      const presignedResponse = await fetch(
        `${apiBaseUrl}/s3/presigned/download?key=${encodeURIComponent(s3Key)}&fileName=${encodeURIComponent(attachment.fileName)}`,
      );
      const { url } = await presignedResponse.json();
      if (url) {
        window.open(url, "_blank");
      }
    } catch (error: unknown) {
      console.error("Failed to download attachment:", error);
    }
  };

  const handlePreviewTextFile = async (attachment: {
    id: number;
    taskId: number;
    fileName: string;
    fileExt: string;
  }) => {
    setTextPreviewLoading(true);
    setTextPreviewError(null);
    setTextPreviewContent(null);

    try {
      const s3Key = getAttachmentS3Key(
        attachment.taskId,
        attachment.id,
        attachment.fileExt,
      );
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
      const presignedResponse = await fetch(
        `${apiBaseUrl}/s3/presigned/download?key=${encodeURIComponent(s3Key)}&fileName=${encodeURIComponent(attachment.fileName)}`,
      );
      const { url } = await presignedResponse.json();

      if (url) {
        const contentResponse = await fetch(url);
        if (!contentResponse.ok) {
          throw new Error("Failed to fetch file content");
        }
        const text = await contentResponse.text();
        setTextPreviewContent(text);
      }
    } catch (error: unknown) {
      console.error("Failed to preview text file:", error);
      setTextPreviewError(
        error instanceof Error ? error.message : "Failed to load file content",
      );
    } finally {
      setTextPreviewLoading(false);
    }
  };

  // Render helper: People Section (Assignee and Author)
  const renderPeopleSection = () => (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-gray-500 dark:text-neutral-500" />
        <AssigneeAvatarGroup
          assignees={
            currentTask.taskAssignments &&
            currentTask.taskAssignments.length > 0
              ? currentTask.taskAssignments.map((ta) => ({
                  userId: ta.user.userId,
                  username: ta.user.username,
                  profilePictureExt: ta.user.profilePictureExt,
                }))
              : []
          }
          size={32}
        />
      </div>
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-gray-500 dark:text-neutral-500" />
        <UserIcon
          userId={currentTask.author?.userId}
          username={currentTask.author?.username}
          fullName={currentTask.author?.fullName}
          profilePictureExt={currentTask.author?.profilePictureExt}
          size={32}
          tooltipLabel="Author"
          opacity="opacity-75"
        />
      </div>
    </div>
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        name={
          <div className="flex items-center gap-2">
            {currentTask.status === "Done" && (
              <div className="relative shrink-0">
                <div className="h-5 w-5 rotate-45 bg-green-500" />
                <Check
                  size={14}
                  className="absolute inset-0 m-auto text-white"
                />
              </div>
            )}
            <span>{currentTask.title}</span>
            {typeof currentTask.points === "number" && (
              <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {currentTask.points} pts
              </span>
            )}
          </div>
        }
        hideClose={true}
        floatingActions={
          <div className="flex items-center gap-2">
            <TaskDetailsFloatingButton
              icon={<X size={18} />}
              onClick={onClose}
              title="Close"
            />
            <TaskDetailsFloatingButton
              icon={linkCopied ? <Check size={18} /> : <Link2 size={18} />}
              onClick={handleCopyLink}
              title={linkCopied ? "Link copied!" : "Copy link"}
              active={linkCopied}
            />
            <TaskDetailsFloatingButton
              icon={<Copy size={18} />}
              onClick={() => setShowDuplicateConfirm(true)}
              disabled={isDuplicating}
              title="Duplicate task"
            />
            <TaskDetailsFloatingButton
              icon={<Pencil size={18} />}
              onClick={handleEditClick}
              title="Edit task"
            />
            <TaskDetailsFloatingButton
              icon={<Trash2 size={18} />}
              onClick={() => setShowDeleteConfirm(true)}
              title="Delete task"
              variant="danger"
            />
          </div>
        }
        leftPanel={
          <div className="flex animate-slide-in-left flex-col items-end gap-3 pt-4">
            {/* Board */}
            {boards && (
              <div className="flex items-center gap-2">
                <Link
                  href={`/boards/${currentTask.boardId}`}
                  className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-800 hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-200 dark:hover:bg-indigo-800"
                >
                  {boards.find((b) => b.id === currentTask.boardId)?.name ||
                    `Board ${currentTask.boardId}`}
                </Link>
                <div className="group relative">
                  <BiColumns className="h-4 w-4 text-white dark:text-neutral-500" />
                </div>
              </div>
            )}

            {/* Priority */}
            {currentTask.priority && (
              <div className="flex items-center gap-2">
                <PriorityTag priority={currentTask.priority} />
                <div className="group relative">
                  <Flag className="h-4 w-4 text-white dark:text-neutral-500" />
                </div>
              </div>
            )}

            {/* Status */}
            {currentTask.status && (
              <div className="flex items-center gap-2">
                <StatusBadge status={currentTask.status} />
                <div className="group relative">
                  <Award className="h-4 w-4 text-white dark:text-neutral-500" />
                </div>
              </div>
            )}

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex items-start gap-2">
                <div className="flex flex-wrap justify-end gap-1">
                  {currentTask.taskTags?.map((tt) => (
                    <span
                      key={tt.tag.id}
                      className="rounded-full px-2.5 py-1 text-xs font-semibold text-white"
                      style={{ backgroundColor: tt.tag.color || "#3b82f6" }}
                    >
                      {tt.tag.name}
                    </span>
                  ))}
                </div>
                <div className="group relative">
                  <Tag className="mt-0.5 h-4 w-4 text-white dark:text-neutral-500" />
                </div>
              </div>
            )}

            {/* Sprints */}
            {currentTask.sprints && currentTask.sprints.length > 0 && (
              <div className="flex items-start gap-2">
                <div className="flex flex-wrap justify-end gap-1">
                  {currentTask.sprints.map((sprint) => (
                    <Link
                      key={sprint.id}
                      href={`/sprints/${sprint.id}`}
                      className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-800 hover:bg-purple-200 dark:bg-purple-900 dark:text-purple-200 dark:hover:bg-purple-800"
                    >
                      {sprint.title}
                    </Link>
                  ))}
                </div>
                <div className="group relative">
                  <Zap className="mt-0.5 h-4 w-4 text-white dark:text-neutral-500" />
                </div>
              </div>
            )}
          </div>
        }
        rightPanel={
          <CommentsPanel
            taskId={currentTask.id}
            comments={currentTask.comments || []}
            users={users}
            currentUser={authData?.userDetails}
          />
        }
      >
        <div className="animate-fade-in-up space-y-4 dark:text-white">
          {/* Description */}
          <div>
            {currentTask.description ? (
              <div className="prose prose-sm prose-headings:text-gray-800 prose-a:text-blue-600 prose-strong:text-gray-700 prose-code:rounded prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:text-gray-800 prose-pre:bg-gray-100 dark:prose-headings:text-neutral-200 dark:prose-a:text-blue-400 dark:prose-strong:text-neutral-300 dark:prose-code:bg-dark-tertiary dark:prose-code:text-neutral-200 dark:prose-pre:bg-dark-tertiary wrap-break-word max-w-none text-gray-600 dark:text-neutral-400">
                <Markdown>{currentTask.description}</Markdown>
              </div>
            ) : (
              <p className="text-gray-600 dark:text-neutral-400">
                No description provided
              </p>
            )}
          </div>

          {/* Schedule - Start Date & Due Date */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500 dark:text-neutral-500" />
              <span className="text-sm text-gray-600 dark:text-neutral-400">
                Start:
              </span>
              <span className="text-sm text-gray-900 dark:text-white">
                {formattedStartDate}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500 dark:text-neutral-500" />
              <span className="text-sm text-gray-600 dark:text-neutral-400">
                Due:
              </span>
              <span className="text-sm text-gray-900 dark:text-white">
                {formattedDueDate}
              </span>
            </div>
          </div>

          {/* People Section */}
          {renderPeopleSection()}

          {/* Attachments, Subtasks, and Activity */}
          {((currentTask.attachments && currentTask.attachments.length > 0) ||
            hasHierarchy ||
            (currentTask.activities && currentTask.activities.length > 0)) && (
            <div className="space-y-2">
              {/* Attachments */}
              {currentTask.attachments &&
                currentTask.attachments.length > 0 && (
                  <CollapsibleSection
                    title="Attachments"
                    count={currentTask.attachments.length}
                  >
                    <div className="space-y-2">
                      {currentTask.attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="rounded-lg border border-gray-200 dark:border-stroke-dark"
                        >
                          <div className="flex items-center justify-between bg-gray-50 px-3 py-2 dark:bg-dark-tertiary">
                            <p className="truncate text-sm text-gray-700 dark:text-neutral-300">
                              {attachment.fileName}
                            </p>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() =>
                                  handleDownloadAttachment(attachment)
                                }
                                className="rounded bg-gray-200 p-1.5 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
                                title="Download"
                              >
                                <Download size={14} />
                              </button>
                              {(isImageFile(attachment.fileExt) ||
                                isTextFile(attachment.fileExt)) && (
                                <button
                                  onClick={() => {
                                    if (previewAttachmentId === attachment.id) {
                                      setPreviewAttachmentId(null);
                                      setTextPreviewContent(null);
                                      setTextPreviewError(null);
                                    } else {
                                      setPreviewAttachmentId(attachment.id);
                                      if (isTextFile(attachment.fileExt)) {
                                        handlePreviewTextFile(attachment);
                                      }
                                    }
                                  }}
                                  className="rounded bg-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
                                >
                                  {previewAttachmentId === attachment.id
                                    ? "Hide"
                                    : "Preview"}
                                </button>
                              )}
                            </div>
                          </div>
                          {previewAttachmentId === attachment.id && (
                            <div className="animate-slide-down p-2">
                              {isImageFile(attachment.fileExt) ? (
                                <S3Image
                                  s3Key={getAttachmentS3Key(
                                    attachment.taskId,
                                    attachment.id,
                                    attachment.fileExt,
                                  )}
                                  alt={attachment.fileName}
                                  width={600}
                                  height={400}
                                  className="h-auto w-full rounded object-contain"
                                  fallbackType="image"
                                />
                              ) : isTextFile(attachment.fileExt) ? (
                                <div className="max-h-96 overflow-auto rounded bg-gray-100 p-3 dark:bg-dark-bg">
                                  {textPreviewLoading ? (
                                    <p className="text-sm text-gray-500 dark:text-neutral-400">
                                      Loading...
                                    </p>
                                  ) : textPreviewError ? (
                                    <p className="text-sm text-red-500 dark:text-red-400">
                                      {textPreviewError}
                                    </p>
                                  ) : (
                                    <pre className="wrap-break-word whitespace-pre-wrap font-mono text-xs text-gray-800 dark:text-neutral-200">
                                      {textPreviewContent}
                                    </pre>
                                  )}
                                </div>
                              ) : null}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CollapsibleSection>
                )}

              {/* Subtasks */}
              {hasHierarchy && (
                <SubtaskHierarchy
                  parentTask={currentTask.parentTask}
                  subtasks={currentTask.subtasks}
                  onTaskClick={handleTaskNavigation}
                />
              )}

              {/* Activity */}
              {currentTask.activities && currentTask.activities.length > 0 && (
                <ActivityList activities={currentTask.activities} />
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Edit Modal */}
      <TaskDetailsEditModal
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        task={currentTask}
        onSave={handleEditSave}
      />

      {/* Delete Confirmation */}
      <ConfirmationMenu
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={async () => {
          await deleteTask(currentTask.id);
          setShowDeleteConfirm(false);
          onClose();
        }}
        title="Delete Task"
        message={`Are you sure you want to delete "${currentTask.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        isLoading={isDeleting}
        variant="danger"
      />

      {/* Duplicate Confirmation */}
      <ConfirmationMenu
        isOpen={showDuplicateConfirm}
        onClose={() => {
          setShowDuplicateConfirm(false);
          setNewTaskTitle("");
        }}
        onConfirm={async () => {
          await handleDuplicate();
          setShowDuplicateConfirm(false);
        }}
        title="Duplicate Task"
        message={`Create a copy of "${currentTask.title}"?`}
        confirmLabel="Duplicate"
        isLoading={isDuplicating}
        variant="info"
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            New Task Name
          </label>
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder={`${currentTask.title} (Copy)`}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white dark:placeholder-gray-500"
          />
        </div>
      </ConfirmationMenu>
    </>
  );
};

export default TaskDetailModal;
