"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Modal from "../Modal";
import SubtaskHierarchy from "@/components/SubtaskHierarchy";
import ActivityList from "@/components/ActivityList";
import CollapsibleSection from "@/components/CollapsibleSection";
import CommentsPanel from "@/components/CommentsPanel";
import DatePicker from "@/components/DatePicker";
import ProjectSelector from "@/components/ProjectSelector";
import { Task, Priority, Status, useUpdateTaskMutation, useDeleteTaskMutation, useCreateTaskMutation, useGetUsersQuery, useGetTagsQuery, useGetProjectsQuery, useGetSprintsQuery, useGetPresignedUploadUrlMutation, useCreateAttachmentMutation, useDeleteAttachmentMutation, getAttachmentS3Key, User as UserType, Project, Sprint } from "@/state/api";
import { useAuthUser } from "@/lib/useAuthUser";
import { PRIORITY_BADGE_STYLES } from "@/lib/priorityColors";
import { STATUS_BADGE_STYLES } from "@/lib/statusColors";
import { parseLocalDate } from "@/lib/dateUtils";
import { format } from "date-fns";
import { Calendar, User, Users, Tag, Award, Pencil, X, Plus, Zap, Flag, Trash2, ChevronDown, ChevronRight, Copy, Check, ArrowLeft, Link2, Paperclip, Upload, Download } from "lucide-react";
import { validateFile, FILE_INPUT_ACCEPT, MAX_FILE_SIZE_MB } from "@/lib/attachmentUtils";
import UserIcon from "@/components/UserIcon";
import AssigneeAvatarGroup from "@/components/AssigneeAvatarGroup";
import S3Image from "@/components/S3Image";
import { BiColumns } from "react-icons/bi";
import ConfirmationMenu from "@/components/ConfirmationMenu";

// Portal wrapper for dropdowns
const DropdownPortal = ({ children, anchorRef, isOpen }: { children: React.ReactNode; anchorRef: React.RefObject<HTMLElement | null>; isOpen: boolean }) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (isOpen && anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
      });
    }
  }, [isOpen, anchorRef]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div style={{ position: "absolute", top: position.top, left: position.left, zIndex: 9999 }}>
      {children}
    </div>,
    document.body
  );
};

// Left panel edit mode section container styles
const LEFT_PANEL_SECTION_CLASS = "flex flex-wrap gap-1 justify-end max-w-[400px]";

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
  const baseClasses = "flex h-9 w-9 items-center justify-center rounded-full shadow-lg transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:hover:scale-100";
  
  const variantClasses: Record<FloatingButtonVariant, string> = {
    default: "bg-white text-gray-600 hover:bg-gray-100 dark:bg-dark-secondary dark:text-neutral-300 dark:hover:bg-dark-tertiary",
    success: "bg-green-500 text-white hover:bg-green-600",
    danger: "bg-white text-red-500 hover:bg-red-50 dark:bg-dark-secondary dark:hover:bg-red-900/20",
  };

  const activeClasses = active ? "bg-green-500 text-white" : variantClasses[variant];

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

// URL regex pattern for auto-linking
const URL_REGEX = /(https?:\/\/[^\s<]+[^\s<.,;:!?"'\])>])/g;

// Helper to render text with auto-linked URLs
const LinkifiedText = ({ text }: { text: string }) => {
  const parts = text.split(URL_REGEX);
  
  return (
    <>
      {parts.map((part, index) => {
        if (URL_REGEX.test(part)) {
          // Reset regex lastIndex since we're reusing it
          URL_REGEX.lastIndex = 0;
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
            >
              {part}
            </a>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </>
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

const TaskDetailModal = ({ isOpen, onClose, task, tasks, onTaskNavigate }: TaskDetailModalProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [displayedTaskId, setDisplayedTaskId] = useState<number | null>(null);
  const [localTaskOverride, setLocalTaskOverride] = useState<Task | null>(null);
  const [saveMessage, setSaveMessage] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false);
  const [attachmentToDelete, setAttachmentToDelete] = useState<{ id: number; fileName: string } | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [updateTask, { isLoading: isUpdating }] = useUpdateTaskMutation();
  const [deleteTask, { isLoading: isDeleting }] = useDeleteTaskMutation();
  const [createTask, { isLoading: isDuplicating }] = useCreateTaskMutation();
  const [getPresignedUploadUrl] = useGetPresignedUploadUrlMutation();
  const [createAttachment] = useCreateAttachmentMutation();
  const [deleteAttachment] = useDeleteAttachmentMutation();
  const { data: users } = useGetUsersQuery();
  const { data: allTags } = useGetTagsQuery();
  const { data: projects } = useGetProjectsQuery();
  const { data: sprints } = useGetSprintsQuery();
  const { data: authData } = useAuthUser();
  const [previewAttachmentId, setPreviewAttachmentId] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const [selectedAssignees, setSelectedAssignees] = useState<UserType[]>([]);
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedSprints, setSelectedSprints] = useState<Sprint[]>([]);
  const [sprintSearch, setSprintSearch] = useState("");
  const [showSprintDropdown, setShowSprintDropdown] = useState(false);
  const [subtasksExpanded, setSubtasksExpanded] = useState(false);

  // Date picker states
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);

  // Dropdown refs
  const assigneeDropdownRef = useRef<HTMLDivElement>(null);
  const sprintDropdownRef = useRef<HTMLDivElement>(null);
  const startDateRef = useRef<HTMLDivElement>(null);
  const dueDateRef = useRef<HTMLDivElement>(null);

  // Sync displayedTaskId and reset edit mode when the modal opens with a new task
  useEffect(() => {
    if (task) {
      setDisplayedTaskId(task.id);
      setLocalTaskOverride(null); // Clear local override when switching tasks
      setIsEditing(false);
    }
  }, [task]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (assigneeDropdownRef.current && !assigneeDropdownRef.current.contains(event.target as Node)) {
        setShowAssigneeDropdown(false);
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
    if (onTaskNavigate) {
      onTaskNavigate(taskId);
    } else {
      setDisplayedTaskId(taskId);
      setIsEditing(false);
    }
  };

  if (!task) return null;

  // Look up the currently displayed task from the tasks list, falling back to the original task prop
  // Use localTaskOverride if available (set after save to show updated data immediately)
  const baseTask =
    displayedTaskId && tasks
      ? tasks.find((t) => t.id === displayedTaskId) ?? task
      : task;
  
  // Use local override if it matches the current task (for immediate display after save)
  const currentTask = (localTaskOverride && localTaskOverride.id === baseTask.id) 
    ? localTaskOverride 
    : baseTask;

  const tags = currentTask.taskTags?.map((tt) => tt.tag.name) || [];

  const hasHierarchy =
    (currentTask.parentTask != null) ||
    (currentTask.subtasks != null && currentTask.subtasks.length > 0);

  const formattedStartDate = currentTask.startDate
    ? format(new Date(currentTask.startDate), "MM/dd/yyyy")
    : "Not set";
  const formattedDueDate = currentTask.dueDate
    ? format(new Date(currentTask.dueDate), "MM/dd/yyyy")
    : "Not set";

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
    
    // Initialize selectedAssignees from taskAssignments
    if (currentTask.taskAssignments && currentTask.taskAssignments.length > 0) {
      const assignees = currentTask.taskAssignments.map(ta => ({
        userId: ta.user.userId,
        username: ta.user.username,
        profilePictureExt: ta.user.profilePictureExt,
      })) as UserType[];
      setSelectedAssignees(assignees);
    } else {
      setSelectedAssignees([]);
    }
    setAssigneeSearch("");
    
    const project = projects?.find(p => p.id === currentTask.projectId);
    setSelectedProject(project || null);
    
    const taskSprints = currentTask.sprints?.map(s => sprints?.find(sp => sp.id === s.id)).filter(Boolean) as Sprint[] || [];
    setSelectedSprints(taskSprints);
    setSprintSearch("");
    
    setIsEditing(true);
  };

  const handleSave = async () => {
    const updatedTask = await updateTask({
      id: currentTask.id,
      title: editTitle,
      description: editDescription,
      status: editStatus as Status,
      priority: editPriority as Priority,
      startDate: editStartDate || undefined,
      dueDate: editDueDate || undefined,
      points: editPoints ? Number(editPoints) : undefined,
      assigneeIds: selectedAssignees.map(a => a.userId).filter((id): id is number => id !== undefined),
      tagIds: editTagIds,
      subtaskIds: editSubtaskIds,
      projectId: selectedProject?.id || undefined,
      sprintIds: selectedSprints.map(s => s.id),
      userId: authData?.userDetails?.userId,
    }).unwrap();
    // Store the mutation result to display immediately while cache updates
    setLocalTaskOverride(updatedTask);
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

  // Autofill helper functions
  const filteredUsers = users?.filter(user => {
    const searchLower = assigneeSearch.toLowerCase().replace("@", "");
    return user.username.toLowerCase().includes(searchLower) ||
      (user.email?.toLowerCase().includes(searchLower) ?? false);
  }) || [];

  const filteredSprints = sprints?.filter(sprint => {
    const searchLower = sprintSearch.toLowerCase();
    const matchesSearch = sprint.title.toLowerCase().includes(searchLower);
    const notAlreadySelected = !selectedSprints.some(s => s.id === sprint.id);
    return matchesSearch && notAlreadySelected;
  }) || [];

  const selectAssignee = (user: UserType) => {
    // Add user to selectedAssignees if not already present
    if (!selectedAssignees.some(a => a.userId === user.userId)) {
      setSelectedAssignees(prev => [...prev, user]);
    }
    setAssigneeSearch("");
    setShowAssigneeDropdown(false);
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
        projectId: currentTask.projectId,
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !authData?.userDetails?.userId) return;

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid file');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    let attachmentId: number | null = null;

    try {
      // Get file extension
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'bin';
      const fileName = file.name;

      // Create attachment record first to get the ID
      const attachment = await createAttachment({
        taskId: currentTask.id,
        uploadedById: authData.userDetails.userId,
        fileName,
        fileExt,
      }).unwrap();
      
      attachmentId = attachment.id;

      // Build S3 key: {stage}/tasks/{taskId}/attachments/{attachmentId}.{ext}
      const s3Key = `tasks/${currentTask.id}/attachments/${attachment.id}.${fileExt}`;

      // Get presigned upload URL
      const { url } = await getPresignedUploadUrl({
        key: s3Key,
        contentType: file.type || 'application/octet-stream',
      }).unwrap();

      // Upload file to S3
      const uploadResponse = await fetch(url, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file to S3');
      }

      // Clear file input and local override on success to refresh from cache
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setLocalTaskOverride(null);
      attachmentId = null; // Clear so we don't delete on success
    } catch (error: any) {
      console.error('File upload error:', error);
      setUploadError(error.message || 'Failed to upload file');
      
      // Clean up attachment record if S3 upload failed
      if (attachmentId) {
        try {
          await deleteAttachment(attachmentId);
        } catch {
          // Ignore cleanup errors
        }
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteAttachment = async (attachmentId: number) => {
    try {
      await deleteAttachment(attachmentId);
      // Clear local override to force refresh from cache
      setLocalTaskOverride(null);
    } catch (error: any) {
      console.error('Failed to delete attachment:', error);
    }
  };

  const handleDownloadAttachment = async (attachment: { id: number; taskId: number; fileName: string; fileExt: string }) => {
    try {
      const s3Key = getAttachmentS3Key(attachment.taskId, attachment.id, attachment.fileExt);
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
      const presignedResponse = await fetch(
        `${apiBaseUrl}/s3/presigned/download?key=${encodeURIComponent(s3Key)}&fileName=${encodeURIComponent(attachment.fileName)}`
      );
      const { url } = await presignedResponse.json();
      if (url) {
        // Open the presigned URL directly - S3 will handle the download with Content-Disposition
        window.open(url, '_blank');
      }
    } catch (error: any) {
      console.error('Failed to download attachment:', error);
    }
  };

  const inputClass =
    "w-full rounded border border-gray-300 p-2 text-sm dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white";
  const selectClass =
    "rounded border border-gray-300 p-2 text-sm dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white";

  // Render helper: People Section (Assignee and Author) - view mode only
  const renderPeopleSection = () => (
    <div className="flex items-center gap-4">
      {/* Assignees */}
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-gray-500 dark:text-neutral-500" />
        <AssigneeAvatarGroup
          assignees={
            currentTask.taskAssignments && currentTask.taskAssignments.length > 0
              ? currentTask.taskAssignments.map(ta => ({
                  userId: ta.user.userId,
                  username: ta.user.username,
                  profilePictureExt: ta.user.profilePictureExt,
                }))
              : []
          }
          size={32}
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
  );

  // Render helper: Edit mode metadata (Points, Board, Assignees, Sprints)
  const renderEditModeMetadata = () => (
    <div className="space-y-4">
      {/* Points */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-gray-500 dark:text-neutral-500" />
          <span className="text-sm text-gray-600 dark:text-neutral-400">Points:</span>
          <input
            type="number"
            min="0"
            className={`${selectClass} w-20`}
            value={editPoints}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "" || Number(val) >= 0) {
                setEditPoints(val);
              }
            }}
          />
        </div>
        {editPoints && Number(editPoints) < 0 && (
          <p className="text-xs text-red-500 dark:text-red-400">Points cannot be negative</p>
        )}
      </div>

      {/* Board/Project Autofill */}
      <ProjectSelector
        projects={projects || []}
        selectedProject={selectedProject}
        onSelect={setSelectedProject}
        inputClassName={inputClass}
      />

      {/* Assignee Autofill - Multi-select */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-neutral-300">
          <span className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            Assignees
          </span>
        </label>
        <div className="relative" ref={assigneeDropdownRef}>
          <div className={`${inputClass} flex flex-wrap gap-2 min-h-[42px] items-center`}>
            {selectedAssignees.map((assignee) => (
              <span
                key={assignee.userId}
                className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
              >
                @{assignee.username}
                <button
                  type="button"
                  onClick={() => setSelectedAssignees(prev => prev.filter(a => a.userId !== assignee.userId))}
                  className="ml-0.5 hover:text-blue-600 dark:hover:text-blue-200"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            <input
              type="text"
              className="flex-1 min-w-[120px] border-none bg-transparent p-0 text-sm focus:outline-none focus:ring-0 dark:text-white"
              placeholder={selectedAssignees.length === 0 ? "Type @ to search users..." : "Add more..."}
              value={assigneeSearch}
              onChange={(e) => {
                setAssigneeSearch(e.target.value);
                setShowAssigneeDropdown(true);
              }}
              onFocus={() => setShowAssigneeDropdown(true)}
            />
          </div>
          {showAssigneeDropdown && (
            <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg dark:border-dark-tertiary dark:bg-dark-secondary">
              {filteredUsers.filter(user => !selectedAssignees.some(a => a.userId === user.userId)).length > 0 ? (
                filteredUsers
                  .filter(user => !selectedAssignees.some(a => a.userId === user.userId))
                  .slice(0, 8)
                  .map((user) => (
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
                  {selectedAssignees.length > 0 && filteredUsers.length > 0 ? "All matching users already selected" : "No users found"}
                </div>
              )}
            </div>
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
  );

  // Render helper: Subtasks Management (edit mode only)
  const renderSubtasksManagement = () => (
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
              {tasks!
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
          {tasks!.filter((t) => t.id !== currentTask.id && t.id !== currentTask.parentTask?.id && !t.parentTask && t.projectId === currentTask.projectId && !editSubtaskIds.includes(t.id)).length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Available Tasks:</p>
              {tasks!
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
          {tasks!.filter((t) => t.id !== currentTask.id && t.id !== currentTask.parentTask?.id && !t.parentTask && t.projectId === currentTask.projectId).length === 0 && (
            <span className="text-sm text-gray-500 dark:text-neutral-400">No available tasks to add as subtasks</span>
          )}
        </div>
      )}
    </div>
  );

  // Render helper: File Upload (edit mode only)
  const renderFileUpload = () => (
    <div className="border-t border-gray-200 pt-4 dark:border-stroke-dark">
      <div className="flex items-center gap-2 mb-3">
        <Paperclip className="h-4 w-4 text-gray-500 dark:text-neutral-500" />
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Attachments</h3>
      </div>
      
      {/* Upload button */}
      <div className="mb-3">
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileUpload}
          className="hidden"
          accept={FILE_INPUT_ACCEPT}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-600 transition-colors hover:border-gray-400 hover:bg-gray-50 disabled:opacity-50 dark:border-stroke-dark dark:text-neutral-400 dark:hover:border-gray-500 dark:hover:bg-dark-tertiary"
        >
          {isUploading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
              Uploading...
            </>
          ) : (
            <>
              <Upload size={16} />
              Upload file (max {MAX_FILE_SIZE_MB}MB)
            </>
          )}
        </button>
        {uploadError && (
          <p className="mt-2 text-xs text-red-500 dark:text-red-400">{uploadError}</p>
        )}
      </div>

      {/* Existing attachments with delete option */}
      {currentTask.attachments && currentTask.attachments.length > 0 && (
        <div className="space-y-2">
          {currentTask.attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-stroke-dark dark:bg-dark-tertiary"
            >
              <span className="truncate text-sm text-gray-700 dark:text-neutral-300">
                {attachment.fileName}
              </span>
              <button
                type="button"
                onClick={() => setAttachmentToDelete({ id: attachment.id, fileName: attachment.fileName })}
                className="ml-2 rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-red-500 dark:hover:bg-gray-600 dark:hover:text-red-400"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      name={
        <div className="flex items-center gap-2">
          {/* Green diamond with checkmark for completed tasks */}
          {currentTask.status === "Done" && (
            <div className="relative flex-shrink-0">
              <div className="h-5 w-5 rotate-45 bg-green-500" />
              <Check size={14} className="absolute inset-0 m-auto text-white" />
            </div>
          )}
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
            <TaskDetailsFloatingButton
              icon={<ArrowLeft size={18} />}
              onClick={handleCancel}
              title="Back"
            />
            <TaskDetailsFloatingButton
              icon={<Check size={18} />}
              onClick={handleSave}
              disabled={isUpdating}
              title={isUpdating ? "Saving..." : "Save"}
              variant="success"
            />
          </div>
        ) : (
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
        )
      }
      leftPanel={
        !isEditing ? (
          <div className="flex flex-col gap-3 pt-4 items-end animate-slide-in-left">
            {/* Board */}
            {projects && (
              <div className="flex items-center gap-2">
                <Link
                  href={`/boards/${currentTask.projectId}`}
                  className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-800 hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-200 dark:hover:bg-indigo-800"
                >
                  {projects.find(p => p.id === currentTask.projectId)?.name || `Board ${currentTask.projectId}`}
                </Link>
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
          <CommentsPanel
            taskId={currentTask.id}
            comments={currentTask.comments || []}
            users={users}
            currentUser={authData?.userDetails}
          />
        ) : undefined
      }
    >
      <div className="space-y-4 dark:text-white animate-fade-in-up">
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
            <p className="text-gray-600 dark:text-neutral-400 break-words whitespace-pre-wrap">
              {currentTask.description ? (
                <LinkifiedText text={currentTask.description} />
              ) : (
                "No description provided"
              )}
            </p>
          )}
        </div>

        {/* Schedule - Start Date & Due Date */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500 dark:text-neutral-500" />
              <span className="text-sm text-gray-600 dark:text-neutral-400">Start:</span>
              {isEditing ? (
                <div ref={startDateRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setShowStartDatePicker(!showStartDatePicker)}
                    className={`${selectClass} min-w-[120px] text-left`}
                  >
                    {editStartDate ? format(parseLocalDate(editStartDate), "MMM d, yyyy") : "Select date"}
                  </button>
                  <DropdownPortal anchorRef={startDateRef} isOpen={showStartDatePicker}>
                    <DatePicker
                      value={editStartDate || undefined}
                      onChange={(date) => {
                        setEditStartDate(date || "");
                        // If due date exists and is before new start date, clear it
                        if (date && editDueDate && parseLocalDate(date) > parseLocalDate(editDueDate)) {
                          setEditDueDate("");
                        }
                        setShowStartDatePicker(false);
                      }}
                      onClose={() => setShowStartDatePicker(false)}
                    />
                  </DropdownPortal>
                </div>
              ) : (
                <span className="text-sm text-gray-900 dark:text-white">{formattedStartDate}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500 dark:text-neutral-500" />
              <span className="text-sm text-gray-600 dark:text-neutral-400">Due:</span>
              {isEditing ? (
                <div ref={dueDateRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setShowDueDatePicker(!showDueDatePicker)}
                    className={`${selectClass} min-w-[120px] text-left`}
                  >
                    {editDueDate ? format(parseLocalDate(editDueDate), "MMM d, yyyy") : "Select date"}
                  </button>
                  <DropdownPortal anchorRef={dueDateRef} isOpen={showDueDatePicker}>
                    <DatePicker
                      value={editDueDate || undefined}
                      onChange={(date) => {
                        // Validate: due date must be after start date
                        if (date && editStartDate && parseLocalDate(date) < parseLocalDate(editStartDate)) {
                          // Don't allow setting due date before start date
                          return;
                        }
                        setEditDueDate(date || "");
                        setShowDueDatePicker(false);
                      }}
                      onClose={() => setShowDueDatePicker(false)}
                      minDate={editStartDate || undefined}
                    />
                  </DropdownPortal>
                </div>
              ) : (
                <span className="text-sm text-gray-900 dark:text-white">{formattedDueDate}</span>
              )}
            </div>
          </div>
          {/* Date validation message */}
          {isEditing && editStartDate && editDueDate && parseLocalDate(editDueDate) < parseLocalDate(editStartDate) && (
            <p className="text-xs text-red-500 dark:text-red-400">Due date must be after start date</p>
          )}
        </div>

        {/* People Section - Assignee and Author */}
        {!isEditing && renderPeopleSection()}

        {/* Edit mode metadata */}
        {isEditing && renderEditModeMetadata()}

        {/* Subtasks Management (edit mode only) */}
        {isEditing && tasks && renderSubtasksManagement()}

        {/* File Upload (edit mode only) */}
        {isEditing && renderFileUpload()}

        {/* Attachments, Subtasks, and Activity — visible in view mode only */}
        {!isEditing && (
          (currentTask.attachments && currentTask.attachments.length > 0) ||
          hasHierarchy ||
          (currentTask.activities && currentTask.activities.length > 0)
        ) && (
          <div className="space-y-2">
            {/* Attachments */}
            {currentTask.attachments && currentTask.attachments.length > 0 && (
              <CollapsibleSection title="Attachments" count={currentTask.attachments.length}>
                <div className="space-y-2">
                  {currentTask.attachments.map((attachment) => (
                    <div key={attachment.id} className="rounded-lg border border-gray-200 dark:border-stroke-dark">
                      <div className="flex items-center justify-between bg-gray-50 px-3 py-2 dark:bg-dark-tertiary">
                        <p className="truncate text-sm text-gray-700 dark:text-neutral-300">
                          {attachment.fileName}
                        </p>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDownloadAttachment(attachment)}
                            className="rounded bg-gray-200 p-1.5 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
                            title="Download"
                          >
                            <Download size={14} />
                          </button>
                          <button
                            onClick={() => setPreviewAttachmentId(previewAttachmentId === attachment.id ? null : attachment.id)}
                            className="rounded bg-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
                          >
                            {previewAttachmentId === attachment.id ? "Hide" : "Preview"}
                          </button>
                        </div>
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
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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

    {/* Attachment Delete Confirmation */}
    <ConfirmationMenu
      isOpen={attachmentToDelete !== null}
      onClose={() => setAttachmentToDelete(null)}
      onConfirm={async () => {
        if (attachmentToDelete) {
          await handleDeleteAttachment(attachmentToDelete.id);
          setAttachmentToDelete(null);
        }
      }}
      title="Delete Attachment"
      message={`Are you sure you want to delete "${attachmentToDelete?.fileName}"? This action cannot be undone.`}
      confirmLabel="Delete"
      variant="danger"
    />
  </>
  );
};

export default TaskDetailModal;