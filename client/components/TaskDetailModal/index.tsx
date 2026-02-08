"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Modal from "../Modal";
import SubtaskHierarchy from "@/components/SubtaskHierarchy";
import CommentReactions, { FloatingReactionButton } from "@/components/CommentReactions";
import ActivityList from "@/components/ActivityList";
import { Task, Priority, Status, useUpdateTaskMutation, useDeleteTaskMutation, useCreateTaskMutation, useGetUsersQuery, useGetTagsQuery, useCreateCommentMutation, useGetAuthUserQuery, useGetProjectsQuery, useGetSprintsQuery, getAttachmentS3Key, getUserProfileS3Key, User as UserType, Project, Sprint, useToggleReactionMutation, useToggleCommentResolvedMutation } from "@/state/api";
import { PRIORITY_BADGE_STYLES } from "@/lib/priorityColors";
import { STATUS_BADGE_STYLES } from "@/lib/statusColors";
import { format, isToday } from "date-fns";
import { Calendar, MessageSquareMore, User, Users, Tag, Award, Pencil, X, Plus, Zap, Flag, Trash2, ChevronDown, ChevronRight, Copy, Check, ArrowLeft, CheckCircle } from "lucide-react";
import UserIcon from "@/components/UserIcon";
import S3Image from "@/components/S3Image";
import { BiColumns } from "react-icons/bi";
import ConfirmationMenu from "@/components/ConfirmationMenu";
import { DEFAULT_QUICK_REACTION } from "@/lib/emojiConstants";

// Format comment timestamp: "1/28/26, 11:56 AM" or just "11:56 AM" if today
const formatCommentTimestamp = (dateString: string): string => {
  const date = new Date(dateString);
  if (isToday(date)) {
    return format(date, "h:mm a");
  }
  return format(date, "M/d/yy, h:mm a");
};

// Render comment text with @mentions as pills
const renderCommentWithMentions = (
  text: string, 
  users: { userId?: number; username: string }[] | undefined
): React.ReactNode => {
  if (!users || users.length === 0) return text;
  
  const usernames = new Set(users.map(u => u.username.toLowerCase()));
  // Match @username patterns (username can contain letters, numbers, underscores)
  const mentionRegex = /@(\w+)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  
  while ((match = mentionRegex.exec(text)) !== null) {
    const username = match[1];
    const isValidUser = usernames.has(username.toLowerCase());
    
    // Add text before the mention
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    
    if (isValidUser) {
      // Render as a pill
      parts.push(
        <span
          key={match.index}
          className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
        >
          @{username}
        </span>
      );
    } else {
      // Not a valid user, render as plain text
      parts.push(match[0]);
    }
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  
  return parts.length > 0 ? parts : text;
};

// Left panel edit mode section container styles
const LEFT_PANEL_SECTION_CLASS = "flex flex-wrap gap-1 justify-end max-w-[400px]";

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  tasks?: Task[];
}

const PriorityTag = ({ priority }: { priority: Task["priority"] }) => {
  const styles = priority ? PRIORITY_BADGE_STYLES[priority] : PRIORITY_BADGE_STYLES.Backlog;
  return (
    <div className={`rounded-full px-2 py-1 text-xs font-semibold ${styles.bg} ${styles.text} ${styles.darkBg} ${styles.darkText}`}>
      {priority}
    </div>
  );
};

const StatusBadge = ({ status }: { status: Task["status"] }) => {
  const styles = status ? STATUS_BADGE_STYLES[status] : STATUS_BADGE_STYLES["Input Queue"];
  return (
    <span
      className={`rounded-full px-2 py-1 text-xs font-semibold ${styles.bg} ${styles.text} ${styles.darkBg} ${styles.darkText}`}
    >
      {status}
    </span>
  );
};

const TaskDetailModal = ({ isOpen, onClose, task, tasks }: TaskDetailModalProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [displayedTaskId, setDisplayedTaskId] = useState<number | null>(null);
  const [saveMessage, setSaveMessage] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false);
  const [updateTask, { isLoading: isUpdating }] = useUpdateTaskMutation();
  const [deleteTask, { isLoading: isDeleting }] = useDeleteTaskMutation();
  const [createTask, { isLoading: isDuplicating }] = useCreateTaskMutation();
  const [createComment, { isLoading: isAddingComment }] = useCreateCommentMutation();
  const [toggleReaction] = useToggleReactionMutation();
  const [toggleCommentResolved] = useToggleCommentResolvedMutation();
  const { data: users } = useGetUsersQuery();
  const { data: allTags } = useGetTagsQuery();
  const { data: projects } = useGetProjectsQuery();
  const { data: sprints } = useGetSprintsQuery();
  const { data: authData } = useGetAuthUserQuery({});
  const [previewAttachmentId, setPreviewAttachmentId] = useState<number | null>(null);
  const [newComment, setNewComment] = useState("");
  
  // Mention state for @ tagging users
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [mentionStartIndex, setMentionStartIndex] = useState<number | null>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);

  // Edit form state
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editPriority, setEditPriority] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editPoints, setEditPoints] = useState("");
  const [editTagIds, setEditTagIds] = useState<number[]>([]);
  const [editSubtaskIds, setEditSubtaskIds] = useState<number[]>([]);

  // Autofill dropdown states
  const [selectedAssignee, setSelectedAssignee] = useState<UserType | null>(null);
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectSearch, setProjectSearch] = useState("");
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [selectedSprints, setSelectedSprints] = useState<Sprint[]>([]);
  const [sprintSearch, setSprintSearch] = useState("");
  const [showSprintDropdown, setShowSprintDropdown] = useState(false);
  const [subtasksExpanded, setSubtasksExpanded] = useState(false);

  // Dropdown refs
  const assigneeDropdownRef = useRef<HTMLDivElement>(null);
  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const sprintDropdownRef = useRef<HTMLDivElement>(null);

  // Sync displayedTaskId and reset edit mode when the modal opens with a new task
  useEffect(() => {
    if (task) {
      setDisplayedTaskId(task.id);
      setIsEditing(false);
    }
  }, [task]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (assigneeDropdownRef.current && !assigneeDropdownRef.current.contains(event.target as Node)) {
        setShowAssigneeDropdown(false);
      }
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setShowProjectDropdown(false);
      }
      if (sprintDropdownRef.current && !sprintDropdownRef.current.contains(event.target as Node)) {
        setShowSprintDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    setEditTagIds(currentTask.taskTags?.map((tt) => tt.tag.id) || []);
    setEditSubtaskIds(currentTask.subtasks?.map((s) => s.id) || []);
    
    // Initialize autofill states
    const assignee = users?.find(u => u.userId === currentTask.assignedUserId);
    setSelectedAssignee(assignee || null);
    setAssigneeSearch("");
    
    const project = projects?.find(p => p.id === currentTask.projectId);
    setSelectedProject(project || null);
    setProjectSearch("");
    
    const taskSprints = currentTask.sprints?.map(s => sprints?.find(sp => sp.id === s.id)).filter(Boolean) as Sprint[] || [];
    setSelectedSprints(taskSprints);
    setSprintSearch("");
    
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
      assignedUserId: selectedAssignee?.userId || undefined,
      tagIds: editTagIds,
      subtaskIds: editSubtaskIds,
      projectId: selectedProject?.id || undefined,
      sprintIds: selectedSprints.map(s => s.id),
      userId: authData?.userDetails?.userId,
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

  // Mention helper functions for @ tagging
  const filteredMentionUsers = users?.filter(user => {
    const searchLower = mentionSearch.toLowerCase();
    return user.username.toLowerCase().includes(searchLower) ||
      (user.email?.toLowerCase().includes(searchLower) ?? false);
  }).slice(0, 5) || [];

  const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    setNewComment(value);
    
    // Check for @ mention trigger
    const textBeforeCursor = value.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      // Only show dropdown if there's no space after @ (still typing username)
      if (!textAfterAt.includes(" ")) {
        setMentionStartIndex(lastAtIndex);
        setMentionSearch(textAfterAt);
        setShowMentionDropdown(true);
        return;
      }
    }
    
    setShowMentionDropdown(false);
    setMentionSearch("");
    setMentionStartIndex(null);
  };

  const selectMention = (username: string) => {
    if (mentionStartIndex === null) return;
    
    const beforeMention = newComment.slice(0, mentionStartIndex);
    const afterMention = newComment.slice(mentionStartIndex + mentionSearch.length + 1);
    const newValue = `${beforeMention}@${username} ${afterMention}`;
    
    setNewComment(newValue);
    setShowMentionDropdown(false);
    setMentionSearch("");
    setMentionStartIndex(null);
    
    // Focus back on input
    commentInputRef.current?.focus();
  };

  // Autofill helper functions
  const filteredUsers = users?.filter(user => {
    const searchLower = assigneeSearch.toLowerCase().replace("@", "");
    return user.username.toLowerCase().includes(searchLower) ||
      (user.email?.toLowerCase().includes(searchLower) ?? false);
  }) || [];

  const filteredProjects = projects?.filter(project => {
    const searchLower = projectSearch.toLowerCase();
    return project.name.toLowerCase().includes(searchLower);
  }) || [];

  const filteredSprints = sprints?.filter(sprint => {
    const searchLower = sprintSearch.toLowerCase();
    const matchesSearch = sprint.title.toLowerCase().includes(searchLower);
    const notAlreadySelected = !selectedSprints.some(s => s.id === sprint.id);
    return matchesSearch && notAlreadySelected;
  }) || [];

  const selectAssignee = (user: UserType) => {
    setSelectedAssignee(user);
    setAssigneeSearch("");
    setShowAssigneeDropdown(false);
  };

  const selectProject = (project: Project) => {
    setSelectedProject(project);
    setProjectSearch("");
    setShowProjectDropdown(false);
  };

  const addSprint = (sprint: Sprint) => {
    setSelectedSprints(prev => [...prev, sprint]);
    setSprintSearch("");
    setShowSprintDropdown(false);
  };

  const removeSprint = (sprintId: number) => {
    setSelectedSprints(prev => prev.filter(s => s.id !== sprintId));
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleDuplicate = async () => {
    // authorUserId is required - use current user or fall back to original author
    const authorId = authData?.userDetails?.userId ?? currentTask.authorUserId;
    if (!authorId) {
      console.error("Failed to duplicate task: No author user ID available");
      return;
    }
    
    try {
      await createTask({
        title: `${currentTask.title} (Copy)`,
        description: currentTask.description || undefined,
        status: currentTask.status || undefined,
        priority: currentTask.priority || undefined,
        startDate: currentTask.startDate || undefined,
        dueDate: currentTask.dueDate || undefined,
        points: currentTask.points ?? undefined,
        projectId: currentTask.projectId,
        authorUserId: authorId,
        assignedUserId: currentTask.assignedUserId ?? undefined,
        tagIds: currentTask.taskTags?.map((tt) => tt.tag.id),
        sprintIds: currentTask.sprints?.map((s) => s.id),
      }).unwrap();
      onClose();
    } catch (error) {
      console.error("Failed to duplicate task:", error);
    }
  };

  const inputClass =
    "w-full rounded border border-gray-300 p-2 text-sm dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white";
  const selectClass =
    "rounded border border-gray-300 p-2 text-sm dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      name={
        <div className="flex items-center gap-2">
          <span>{currentTask.title}</span>
          {!isEditing && typeof currentTask.points === "number" && (
            <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              {currentTask.points} pts
            </span>
          )}
        </div>
      }
      hideClose={true}
      hideHeader={isEditing}
      headerRight={undefined}
      floatingActions={
        isEditing ? (
          <div className="flex items-center gap-2">
            {/* Back button */}
            <button
              onClick={handleCancel}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-600 shadow-lg transition-all duration-200 hover:bg-gray-100 hover:scale-110 active:scale-95 dark:bg-dark-secondary dark:text-neutral-300 dark:hover:bg-dark-tertiary"
              title="Back"
            >
              <ArrowLeft size={18} />
            </button>
            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={isUpdating}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-green-500 text-white shadow-lg transition-all duration-200 hover:bg-green-600 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
              title={isUpdating ? "Saving..." : "Save"}
            >
              <Check size={18} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {/* Close button */}
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-600 shadow-lg transition-all duration-200 hover:bg-gray-100 hover:scale-110 active:scale-95 dark:bg-dark-secondary dark:text-neutral-300 dark:hover:bg-dark-tertiary"
              title="Close"
            >
              <X size={18} />
            </button>
            {/* Duplicate button */}
            <button
              onClick={() => setShowDuplicateConfirm(true)}
              disabled={isDuplicating}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-600 shadow-lg transition-all duration-200 hover:bg-gray-100 hover:scale-110 active:scale-95 dark:bg-dark-secondary dark:text-neutral-300 dark:hover:bg-dark-tertiary disabled:opacity-50 disabled:hover:scale-100"
              title="Duplicate task"
            >
              <Copy size={18} />
            </button>
            {/* Edit button */}
            <button
              onClick={handleEditClick}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-600 shadow-lg transition-all duration-200 hover:bg-gray-100 hover:scale-110 active:scale-95 dark:bg-dark-secondary dark:text-neutral-300 dark:hover:bg-dark-tertiary"
              title="Edit task"
            >
              <Pencil size={18} />
            </button>
            {/* Delete button */}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-red-500 shadow-lg transition-all duration-200 hover:bg-red-50 hover:scale-110 active:scale-95 dark:bg-dark-secondary dark:hover:bg-red-900/20"
              title="Delete task"
            >
              <Trash2 size={18} />
            </button>
          </div>
        )
      }
      leftPanel={
        !isEditing ? (
          <div className="flex flex-col gap-3 pt-4 items-end animate-slide-in-left">
            {/* Board */}
            {projects && (
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                  {projects.find(p => p.id === currentTask.projectId)?.name || `Board ${currentTask.projectId}`}
                </span>
                <div className="relative group">
                  <BiColumns className="h-4 w-4 text-white dark:text-neutral-500" />
                </div>
              </div>
            )}
            
            {/* Priority */}
            {currentTask.priority && (
              <div className="flex items-center gap-2">
                <PriorityTag priority={currentTask.priority} />
                <div className="relative group">
                  <Flag className="h-4 w-4 text-white dark:text-neutral-500" />
                </div>
              </div>
            )}
            
            {/* Status */}
            {currentTask.status && (
              <div className="flex items-center gap-2">
                <StatusBadge status={currentTask.status} />
                <div className="relative group">
                  <Award className="h-4 w-4 text-white dark:text-neutral-500" />
                </div>
              </div>
            )}
            
            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex items-start gap-2">
                <div className="flex flex-wrap gap-1 justify-end">
                  {currentTask.taskTags?.map((tt) => (
                    <span
                      key={tt.tag.id}
                      className="rounded-full px-2.5 py-1 text-xs font-semibold text-white"
                      style={{
                        backgroundColor: tt.tag.color || '#3b82f6',
                      }}
                    >
                      {tt.tag.name}
                    </span>
                  ))}
                </div>
                <div className="relative group">
                  <Tag className="h-4 w-4 text-white dark:text-neutral-500 mt-0.5" />
                </div>
              </div>
            )}
            
            {/* Sprints */}
            {currentTask.sprints && currentTask.sprints.length > 0 && (
              <div className="flex items-start gap-2">
                <div className="flex flex-wrap gap-1 justify-end">
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
                <div className="relative group">
                  <Zap className="h-4 w-4 text-white dark:text-neutral-500 mt-0.5" />
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Edit mode left panel - Status, Priority, Tags */
          <div className="flex flex-col gap-6 pt-4 items-end animate-slide-in-left">
            {/* Priority */}
            <div className="flex items-start gap-2">
              <div className={LEFT_PANEL_SECTION_CLASS}>
                {Object.values(Priority).map((p) => {
                  const isSelected = editPriority === p;
                  const colors = PRIORITY_BADGE_STYLES[p] || PRIORITY_BADGE_STYLES.Backlog;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setEditPriority(p)}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-all ${colors.bg} ${colors.text} ${colors.darkBg} ${colors.darkText} ${
                        isSelected ? "ring-2 ring-offset-1 ring-gray-800 dark:ring-white dark:ring-offset-dark-bg" : "opacity-50 hover:opacity-75"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
              <div className="relative group">
                <Flag className="h-4 w-4 text-white dark:text-neutral-500 mt-0.5" />
              </div>
            </div>

            {/* Status */}
            <div className="flex items-start gap-2">
              <div className={LEFT_PANEL_SECTION_CLASS}>
                {Object.values(Status).map((s) => {
                  const isSelected = editStatus === s;
                  const colors = STATUS_BADGE_STYLES[s] || STATUS_BADGE_STYLES["Input Queue"];
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setEditStatus(s)}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-all ${colors.bg} ${colors.text} ${colors.darkBg} ${colors.darkText} ${
                        isSelected ? "ring-2 ring-offset-1 ring-gray-800 dark:ring-white dark:ring-offset-dark-bg" : "opacity-50 hover:opacity-75"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
              <div className="relative group">
                <Award className="h-4 w-4 text-white dark:text-neutral-500 mt-0.5" />
              </div>
            </div>

            {/* Tags */}
            <div className="flex items-start gap-2">
              <div className={LEFT_PANEL_SECTION_CLASS}>
                {allTags?.map((tag) => {
                  const isSelected = editTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleTagToggle(tag.id)}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold text-white transition-all ${
                        isSelected ? "ring-2 ring-offset-1 ring-gray-800 dark:ring-white dark:ring-offset-dark-bg" : "opacity-40 hover:opacity-70"
                      }`}
                      style={{
                        backgroundColor: tag.color || '#3b82f6',
                      }}
                    >
                      {tag.name}
                    </button>
                  );
                })}
                {(!allTags || allTags.length === 0) && (
                  <span className="text-xs text-gray-400">No tags</span>
                )}
              </div>
              <div className="relative group">
                <Tag className="h-4 w-4 text-white dark:text-neutral-500 mt-0.5" />
              </div>
            </div>
          </div>
        )
      }
      rightPanel={
        !isEditing ? (
          <div className="flex flex-col h-full max-h-[calc(70vh-4rem)]">
            {/* Header */}
            <div className="flex-shrink-0 flex items-center gap-2 border-b border-gray-200 px-4 py-3 dark:border-stroke-dark">
              <MessageSquareMore className="h-4 w-4 text-gray-600 dark:text-neutral-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {numberOfComments} {numberOfComments === 1 ? "comment" : "comments"}
              </span>
            </div>
            
            {/* Comments list */}
            <div className="flex-1 overflow-y-auto min-h-0 p-3 space-y-3">
              {currentTask.comments && currentTask.comments.length > 0 ? (
                currentTask.comments.map((comment) => {
                  const isCurrentUser = comment.user?.userId === authData?.userDetails?.userId;
                  
                  return (
                    <div 
                      key={comment.id} 
                      className="group transition-transform"
                      style={{ transition: "transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
                      onDoubleClick={(e) => {
                        // Requirement 1.6: Double-click creates FeelingYes reaction
                        if (authData?.userDetails?.userId && typeof authData.userDetails.userId === 'number') {
                          // Add scale animation to the comment block
                          const target = e.currentTarget;
                          target.style.transform = "scale(1.02)";
                          setTimeout(() => {
                            target.style.transform = "scale(1)";
                          }, 150);
                          
                          toggleReaction({
                            commentId: comment.id,
                            userId: authData.userDetails.userId,
                            emoji: DEFAULT_QUICK_REACTION,
                          });
                        }
                      }}
                    >
                      <div className="flex gap-2 max-w-[85%]">
                        {comment.user?.profilePictureExt && comment.user?.userId ? (
                          <S3Image
                            s3Key={getUserProfileS3Key(comment.user.userId, comment.user.profilePictureExt)}
                            alt={comment.user.username}
                            width={28}
                            height={28}
                            className="h-7 w-7 rounded-full object-cover flex-shrink-0 mt-1"
                          />
                        ) : (
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500 text-white text-xs font-medium flex-shrink-0 mt-1">
                            {comment.user?.username?.charAt(0).toUpperCase() || "?"}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                              {isCurrentUser ? "You" : (comment.user?.username || "Unknown")}
                            </span>
                            {comment.createdAt && (
                              <span className="text-xs text-gray-400 dark:text-gray-500">
                                {formatCommentTimestamp(comment.createdAt)}
                              </span>
                            )}
                          </div>
                          <div 
                            className={`relative inline-block rounded-2xl px-3 py-2 bg-gray-100 dark:bg-dark-tertiary ${
                              comment.isResolved ? "ring-2 ring-green-500" : ""
                            }`}
                          >
                            {/* Floating buttons on bubble corner */}
                            <div className="absolute -top-2 -right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                              {/* Resolve button */}
                              <button
                                onClick={() => toggleCommentResolved({ commentId: comment.id })}
                                className={`flex h-6 w-6 items-center justify-center rounded-full shadow-md transition-all duration-200 hover:scale-110 ${
                                  comment.isResolved
                                    ? "bg-green-500 text-white hover:bg-green-600"
                                    : "bg-white text-gray-400 hover:bg-gray-100 hover:text-green-500 dark:bg-dark-secondary dark:text-gray-500 dark:hover:bg-dark-tertiary dark:hover:text-green-400"
                                }`}
                                title={comment.isResolved ? "Mark as unresolved" : "Mark as resolved"}
                              >
                                <CheckCircle size={14} />
                              </button>
                              {/* Add reaction button */}
                              <FloatingReactionButton
                                commentId={comment.id}
                                currentUserId={authData?.userDetails?.userId}
                                position="right"
                                inline
                              />
                            </div>
                            <p 
                              className="text-sm break-all text-gray-800 dark:text-neutral-200"
                              style={{ overflowWrap: 'anywhere' }}
                            >
                              {renderCommentWithMentions(comment.text, users)}
                            </p>
                          </div>
                          {/* Comment Reactions - badges only */}
                          <CommentReactions
                            commentId={comment.id}
                            reactions={comment.reactions || []}
                            currentUserId={authData?.userDetails?.userId}
                            hideAddButton
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <MessageSquareMore className="h-8 w-8 text-gray-300 dark:text-gray-600 mb-2" />
                  <p className="text-sm text-gray-500 dark:text-neutral-400">No comments yet</p>
                  <p className="text-xs text-gray-400 dark:text-neutral-500 mt-1">Be the first to comment</p>
                </div>
              )}
            </div>
            
            {/* Add comment input - Google style */}
            <div className="flex-shrink-0 border-t border-gray-200 p-3 dark:border-stroke-dark">
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
                <div className="flex-1 relative">
                  <input
                    ref={commentInputRef}
                    type="text"
                    className="w-full rounded-full border border-gray-300 bg-white px-4 py-2.5 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-dark-secondary dark:text-white dark:placeholder-gray-500"
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={handleCommentChange}
                    onKeyDown={(e) => {
                      // Handle mention dropdown navigation
                      if (showMentionDropdown && filteredMentionUsers.length > 0) {
                        if (e.key === "Escape") {
                          setShowMentionDropdown(false);
                          return;
                        }
                        if (e.key === "Tab" || (e.key === "Enter" && filteredMentionUsers.length > 0)) {
                          e.preventDefault();
                          selectMention(filteredMentionUsers[0].username);
                          return;
                        }
                      }
                      
                      if (e.key === "Enter" && !showMentionDropdown && newComment.trim() && authData?.userDetails?.userId && typeof authData.userDetails.userId === 'number') {
                        createComment({
                          taskId: currentTask.id,
                          userId: authData.userDetails.userId,
                          text: newComment.trim(),
                        });
                        setNewComment("");
                      }
                    }}
                    onBlur={() => {
                      // Delay hiding to allow click on dropdown
                      setTimeout(() => setShowMentionDropdown(false), 150);
                    }}
                  />
                  
                  {/* Mention dropdown */}
                  {showMentionDropdown && filteredMentionUsers.length > 0 && (
                    <div className="absolute bottom-full left-0 mb-1 w-full max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-dark-secondary z-50">
                      {filteredMentionUsers.map((user) => (
                        <button
                          key={user.userId}
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-dark-tertiary"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            selectMention(user.username);
                          }}
                        >
                          {user.profilePictureExt && user.userId ? (
                            <S3Image
                              s3Key={getUserProfileS3Key(user.userId, user.profilePictureExt)}
                              alt={user.username}
                              width={24}
                              height={24}
                              className="h-6 w-6 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white text-xs">
                              {user.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {user.username}
                            </p>
                            {user.email && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {user.email}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
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
      <div className="space-y-6 dark:text-white animate-fade-in-up">
        {/* Save success message */}
        {saveMessage && (
          <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-300 animate-slide-down">
            Task saved successfully
          </div>
        )}
        
        {/* Title edit input (only in edit mode) */}
        {isEditing && (
          <input
            className={`${inputClass} animate-slide-down`}
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

        {/* Schedule - Start Date & Due Date */}
        <div className="flex flex-wrap items-center gap-4">
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

        {/* People Section - Assignee and Author */}
        {!isEditing && (
          <div className="flex items-center gap-4">
            {/* Assignee */}
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-500 dark:text-neutral-500" />
              <UserIcon
                userId={currentTask.assignee?.userId}
                username={currentTask.assignee?.username}
                profilePictureExt={currentTask.assignee?.profilePictureExt}
                size={32}
                tooltipLabel="Assignee"
              />
            </div>
            
            {/* Author */}
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-500 dark:text-neutral-500" />
              <UserIcon
                userId={currentTask.author?.userId}
                username={currentTask.author?.username}
                profilePictureExt={currentTask.author?.profilePictureExt}
                size={32}
                tooltipLabel="Author"
                opacity="opacity-75"
              />
            </div>
          </div>
        )}

        {/* Edit mode metadata */}
        {isEditing && (
          <div className="space-y-4">
            {/* Points */}
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

            {/* Board/Project Autofill */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-neutral-300">
                <span className="flex items-center gap-1.5">
                  <BiColumns className="h-4 w-4" />
                  Board
                </span>
              </label>
              <div className="relative" ref={projectDropdownRef}>
                {selectedProject ? (
                  <div className={`${inputClass} flex items-center justify-between`}>
                    <span>{selectedProject.name}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedProject(null)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <input
                        type="text"
                        className={inputClass}
                        placeholder="Search boards..."
                        value={projectSearch}
                        onChange={(e) => {
                          setProjectSearch(e.target.value);
                          setShowProjectDropdown(true);
                        }}
                        onFocus={() => setShowProjectDropdown(true)}
                      />
                      <ChevronDown
                        size={16}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                    </div>
                    {showProjectDropdown && (
                      <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg dark:border-dark-tertiary dark:bg-dark-secondary">
                        {filteredProjects.length > 0 ? (
                          filteredProjects.map((project) => (
                            <button
                              key={project.id}
                              type="button"
                              onClick={() => selectProject(project)}
                              className="flex w-full flex-col px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-dark-tertiary"
                            >
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {project.name}
                              </span>
                              {project.description && (
                                <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {project.description}
                                </span>
                              )}
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                            No boards found
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Assignee Autofill */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-neutral-300">
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  Assignee
                </span>
              </label>
              <div className="relative" ref={assigneeDropdownRef}>
                {selectedAssignee ? (
                  <div className={`${inputClass} flex items-center justify-between`}>
                    <span>@{selectedAssignee.username}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedAssignee(null)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <input
                        type="text"
                        className={inputClass}
                        placeholder="Type @ to search users..."
                        value={assigneeSearch}
                        onChange={(e) => {
                          setAssigneeSearch(e.target.value);
                          setShowAssigneeDropdown(true);
                        }}
                        onFocus={() => setShowAssigneeDropdown(true)}
                      />
                      <ChevronDown
                        size={16}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                    </div>
                    {showAssigneeDropdown && (
                      <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg dark:border-dark-tertiary dark:bg-dark-secondary">
                        {filteredUsers.length > 0 ? (
                          filteredUsers.slice(0, 8).map((user) => (
                            <button
                              key={user.userId}
                              type="button"
                              onClick={() => selectAssignee(user)}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-dark-tertiary"
                            >
                              <span className="font-medium text-gray-900 dark:text-white">@{user.username}</span>
                              {user.email && <span className="text-gray-500 dark:text-gray-400">{user.email}</span>}
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                            No users found
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Sprints Autofill */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-neutral-300">
                <span className="flex items-center gap-1.5">
                  <Zap className="h-4 w-4" />
                  Sprints
                </span>
              </label>
              <div className="relative" ref={sprintDropdownRef}>
                <div className={`${inputClass} flex flex-wrap gap-2 min-h-[42px] items-center`}>
                  {selectedSprints.map((sprint) => (
                    <span
                      key={sprint.id}
                      className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                    >
                      {sprint.title}
                      <button
                        type="button"
                        onClick={() => removeSprint(sprint.id)}
                        className="ml-0.5 hover:text-purple-600 dark:hover:text-purple-200"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    className="flex-1 min-w-[120px] border-none bg-transparent p-0 text-sm focus:outline-none focus:ring-0 dark:text-white"
                    placeholder={selectedSprints.length === 0 ? "Search sprints..." : "Add more..."}
                    value={sprintSearch}
                    onChange={(e) => {
                      setSprintSearch(e.target.value);
                      setShowSprintDropdown(true);
                    }}
                    onFocus={() => setShowSprintDropdown(true)}
                  />
                </div>
                {showSprintDropdown && (
                  <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg dark:border-dark-tertiary dark:bg-dark-secondary">
                    {filteredSprints.length > 0 ? (
                      filteredSprints.slice(0, 8).map((sprint) => (
                        <button
                          key={sprint.id}
                          type="button"
                          onClick={() => addSprint(sprint)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-dark-tertiary"
                        >
                          <Zap size={14} className="text-purple-500" />
                          <span className="font-medium text-gray-900 dark:text-white">{sprint.title}</span>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                        {sprints?.length === 0 ? "No sprints available" : "No matching sprints"}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Subtasks Management (edit mode only) */}
        {isEditing && tasks && (
          <div>
            <button
              type="button"
              onClick={() => setSubtasksExpanded(!subtasksExpanded)}
              className="mb-2 flex w-full items-center justify-between rounded-lg px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-dark-tertiary"
            >
              <div className="flex items-center gap-2">
                {subtasksExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-500 dark:text-neutral-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-500 dark:text-neutral-500" />
                )}
                <Award className="h-4 w-4 text-gray-500 dark:text-neutral-500" />
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Subtasks</h3>
                {editSubtaskIds.length > 0 && (
                  <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600 dark:bg-dark-tertiary dark:text-gray-400">
                    {editSubtaskIds.length}
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-500 dark:text-neutral-400">
                Click to add/remove
              </span>
            </button>
            {subtasksExpanded && (
              <div className="space-y-2 pl-2">
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
            )}
          </div>
        )}

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
          onClose={() => setShowDuplicateConfirm(false)}
          onConfirm={async () => {
            await handleDuplicate();
            setShowDuplicateConfirm(false);
          }}
          title="Duplicate Task"
          message={`Create a copy of "${currentTask.title}"?`}
          confirmLabel="Duplicate"
          isLoading={isDuplicating}
          variant="info"
        />

        {/* Attachments */}
        {!isEditing && currentTask.attachments && currentTask.attachments.length > 0 && (
          <div className="border-t border-gray-200 pt-4 dark:border-stroke-dark">
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
                    <div className="p-2 animate-slide-down">
                      <S3Image
                        s3Key={getAttachmentS3Key(attachment.taskId, attachment.id, attachment.fileExt)}
                        alt={attachment.fileName}
                        width={600}
                        height={400}
                        className="h-auto w-full rounded object-contain"
                        fallbackType="image"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
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

        {/* Activity List — visible in view mode only */}
        {!isEditing && currentTask.activities && currentTask.activities.length > 0 && (
          <div className="border-t border-gray-200 pt-4 dark:border-stroke-dark">
            <ActivityList activities={currentTask.activities} />
          </div>
        )}
      </div>
    </Modal>
  );
};

export default TaskDetailModal;