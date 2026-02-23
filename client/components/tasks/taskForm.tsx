"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import DatePicker from "@/components/DatePicker";
import BoardSelector from "@/components/boards/boardSelector";
import { Priority, Status, User, Board, Sprint, Tag, Task } from "@/state/api";
import { PRIORITY_BADGE_STYLES } from "@/lib/priorityColors";
import { STATUS_BADGE_STYLES } from "@/lib/statusColors";
import { parseLocalDate } from "@/lib/dateUtils";
import {
  validateFile,
  FILE_INPUT_ACCEPT,
  MAX_FILE_SIZE_MB,
} from "@/lib/attachmentUtils";
import { format } from "date-fns";
import {
  X,
  Zap,
  Flag,
  Award,
  Tag as TagIcon,
  Calendar,
  Users,
  ChevronDown,
  ChevronRight,
  Plus,
  Paperclip,
  Upload,
  Trash2,
  Search,
} from "lucide-react";
import UserIcon from "@/components/UserIcon";

// Pending file for upload (before task is created)
export type PendingFile = {
  id: string; // temporary client-side ID
  file: File;
  fileName: string;
  fileExt: string;
};

export type TaskFormData = {
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  startDate: string;
  dueDate: string;
  points: string;
  selectedTagIds: number[];
  selectedAssignees: User[];
  selectedBoard: Board | null;
  selectedSprints: Sprint[];
  selectedSubtaskIds: number[];
  pendingFiles: PendingFile[];
};

type TaskFormProps = {
  formData: TaskFormData;
  onChange: (data: Partial<TaskFormData>) => void;
  users: User[];
  boards: Board[];
  sprints: Sprint[];
  tags: Tag[];
  showPoints?: boolean;
  filterActiveOnly?: boolean;
  showSubtasks?: boolean;
  showAttachments?: boolean;
  availableTasks?: Task[];
  currentTaskId?: number;
  inputClassName?: string;
  renderBeforeSubtasks?: React.ReactNode;
};

export default function TaskForm({
  formData,
  onChange,
  users,
  boards,
  sprints,
  tags,
  showPoints = false,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  filterActiveOnly: _filterActiveOnly = true,
  showSubtasks = false,
  showAttachments = false,
  availableTasks = [],
  currentTaskId,
  inputClassName,
  renderBeforeSubtasks,
}: TaskFormProps) {
  // Dropdown states
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [sprintSearch, setSprintSearch] = useState("");
  const [showSprintDropdown, setShowSprintDropdown] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [subtasksExpanded, setSubtasksExpanded] = useState(false);
  const [subtaskSearch, setSubtaskSearch] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Position states for portals
  const [assigneeDropdownPosition, setAssigneeDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const [sprintDropdownPosition, setSprintDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });

  // Refs
  const assigneeDropdownRef = useRef<HTMLDivElement>(null);
  const assigneePortalDropdownRef = useRef<HTMLDivElement>(null);
  const sprintDropdownRef = useRef<HTMLDivElement>(null);
  const sprintPortalDropdownRef = useRef<HTMLDivElement>(null);
  const startDateRef = useRef<HTMLButtonElement>(null);
  const dueDateRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter data based on options - always filter out archived for selection
  const activeBoards = boards.filter((b) => b.isActive);
  const activeSprints = sprints.filter((s) => s.isActive);

  // Filtered lists for dropdowns
  const filteredUsers = users.filter((user) => {
    const searchLower = assigneeSearch.toLowerCase().replace("@", "");
    const matchesSearch =
      user.username.toLowerCase().includes(searchLower) ||
      (user.email?.toLowerCase().includes(searchLower) ?? false);
    const notAlreadySelected = !formData.selectedAssignees.some(
      (a) => a.userId === user.userId,
    );
    return matchesSearch && notAlreadySelected;
  });

  const filteredSprints = activeSprints.filter((sprint) => {
    const searchLower = sprintSearch.toLowerCase();
    const matchesSearch = sprint.title.toLowerCase().includes(searchLower);
    const notAlreadySelected = !formData.selectedSprints.some(
      (s) => s.id === sprint.id,
    );
    return matchesSearch && notAlreadySelected;
  });

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInsideAssigneeContainer =
        assigneeDropdownRef.current?.contains(target);
      const isInsideAssigneePortal =
        assigneePortalDropdownRef.current?.contains(target);
      if (!isInsideAssigneeContainer && !isInsideAssigneePortal) {
        setShowAssigneeDropdown(false);
      }
      const isInsideSprintContainer =
        sprintDropdownRef.current?.contains(target);
      const isInsideSprintPortal =
        sprintPortalDropdownRef.current?.contains(target);
      if (!isInsideSprintContainer && !isInsideSprintPortal) {
        setShowSprintDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update dropdown positions on scroll/resize
  useEffect(() => {
    const updatePositions = () => {
      if (showAssigneeDropdown && assigneeDropdownRef.current) {
        const rect = assigneeDropdownRef.current.getBoundingClientRect();
        setAssigneeDropdownPosition({
          top: rect.bottom + 4,
          left: rect.left,
          width: rect.width,
        });
      }
      if (showSprintDropdown && sprintDropdownRef.current) {
        const rect = sprintDropdownRef.current.getBoundingClientRect();
        setSprintDropdownPosition({
          top: rect.bottom + 4,
          left: rect.left,
          width: rect.width,
        });
      }
    };

    // Listen to scroll on all scrollable ancestors
    const handleScroll = () => updatePositions();
    const handleResize = () => updatePositions();

    window.addEventListener("scroll", handleScroll, true); // capture phase to catch modal scroll
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [showAssigneeDropdown, showSprintDropdown]);

  // Handlers
  const toggleTag = (tagId: number) => {
    const newTagIds = formData.selectedTagIds.includes(tagId)
      ? formData.selectedTagIds.filter((id) => id !== tagId)
      : [...formData.selectedTagIds, tagId];
    onChange({ selectedTagIds: newTagIds });
  };

  const addAssignee = (user: User) => {
    onChange({ selectedAssignees: [...formData.selectedAssignees, user] });
    setAssigneeSearch("");
    setShowAssigneeDropdown(false);
  };

  const removeAssignee = (userId: number | undefined) => {
    onChange({
      selectedAssignees: formData.selectedAssignees.filter(
        (a) => a.userId !== userId,
      ),
    });
  };

  const addSprint = (sprint: Sprint) => {
    onChange({ selectedSprints: [...formData.selectedSprints, sprint] });
    setSprintSearch("");
    setShowSprintDropdown(false);
  };

  const removeSprint = (sprintId: number) => {
    onChange({
      selectedSprints: formData.selectedSprints.filter(
        (s) => s.id !== sprintId,
      ),
    });
  };

  // Subtask handlers
  const toggleSubtask = (taskId: number) => {
    const currentIds = formData.selectedSubtaskIds || [];
    const newSubtaskIds = currentIds.includes(taskId)
      ? currentIds.filter((id) => id !== taskId)
      : [...currentIds, taskId];
    onChange({ selectedSubtaskIds: newSubtaskIds });
  };

  // File handlers
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || "Invalid file");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploadError(null);
    const fileExt = file.name.split(".").pop()?.toLowerCase() || "bin";
    const pendingFile: PendingFile = {
      id: `pending-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      fileName: file.name,
      fileExt,
    };
    const currentFiles = formData.pendingFiles || [];
    onChange({ pendingFiles: [...currentFiles, pendingFile] });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePendingFile = (fileId: string) => {
    const currentFiles = formData.pendingFiles || [];
    onChange({
      pendingFiles: currentFiles.filter((f) => f.id !== fileId),
    });
  };

  // Filter available tasks for subtask selection
  const availableSubtasks = availableTasks.filter((t) => {
    if (currentTaskId && t.id === currentTaskId) return false;
    if (t.parentTask) return false;
    if (formData.selectedBoard && t.boardId !== formData.selectedBoard.id)
      return false;
    return true;
  });

  const inputStyles =
    inputClassName ||
    "w-full rounded border border-gray-300 p-2 shadow-sm dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white dark:focus:outline-none";

  const pillStyles =
    "mb-2 block text-sm font-medium text-gray-700 dark:text-neutral-300";

  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <label className={pillStyles}>
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          className={inputStyles}
          placeholder="Title"
          value={formData.title}
          onChange={(e) => onChange({ title: e.target.value })}
        />
      </div>

      {/* Description */}
      <textarea
        className={inputStyles}
        placeholder="Description"
        value={formData.description}
        onChange={(e) => onChange({ description: e.target.value })}
      />

      {/* Status */}
      <div>
        <label className={pillStyles}>
          <span className="flex items-center gap-1.5">
            <Award size={14} />
            Status
          </span>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {Object.values(Status).map((s) => {
            const isSelected = formData.status === s;
            const colors =
              STATUS_BADGE_STYLES[s] || STATUS_BADGE_STYLES["Input Queue"];
            return (
              <button
                key={s}
                type="button"
                onClick={() => onChange({ status: s })}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-all ${colors.bg} ${colors.text} ${colors.darkBg} ${colors.darkText} ${
                  isSelected
                    ? "ring-2 ring-gray-800 ring-offset-1 dark:ring-white dark:ring-offset-dark-bg"
                    : "opacity-50 hover:opacity-75"
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      {/* Priority */}
      <div>
        <label className={pillStyles}>
          <span className="flex items-center gap-1.5">
            <Flag size={14} />
            Priority
          </span>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {Object.values(Priority).map((p) => {
            const isSelected = formData.priority === p;
            const colors =
              PRIORITY_BADGE_STYLES[p] || PRIORITY_BADGE_STYLES.Backlog;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onChange({ priority: p })}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-all ${colors.bg} ${colors.text} ${colors.darkBg} ${colors.darkText} ${
                  isSelected
                    ? "ring-2 ring-gray-800 ring-offset-1 dark:ring-white dark:ring-offset-dark-bg"
                    : "opacity-50 hover:opacity-75"
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className={pillStyles}>
          <span className="flex items-center gap-1.5">
            <TagIcon size={14} />
            Tags
          </span>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => {
            const isSelected = formData.selectedTagIds.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold text-white transition-all ${
                  isSelected
                    ? "ring-2 ring-gray-800 ring-offset-1 dark:ring-white dark:ring-offset-dark-bg"
                    : "opacity-40 hover:opacity-70"
                }`}
                style={{ backgroundColor: tag.color || "#3b82f6" }}
              >
                {tag.name}
              </button>
            );
          })}
          {tags.length === 0 && (
            <p className="text-xs text-gray-400">No tags available</p>
          )}
        </div>
      </div>

      {/* Points (optional) */}
      {showPoints && (
        <div>
          <label className={pillStyles}>
            <span className="flex items-center gap-1.5">
              <Award size={14} />
              Points
            </span>
          </label>
          <input
            type="number"
            min="0"
            className={`${inputStyles} w-24`}
            placeholder="0"
            value={formData.points}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "" || Number(val) >= 0) {
                onChange({ points: val });
              }
            }}
          />
        </div>
      )}

      {/* Project/Board */}
      <BoardSelector
        boards={activeBoards}
        selectedBoard={formData.selectedBoard}
        onSelect={(board) => onChange({ selectedBoard: board })}
        label={
          <>
            Board <span className="text-red-500">*</span>
          </>
        }
        placeholder="Search boards..."
        inputClassName={inputStyles}
        usePortal
      />

      {/* Sprints */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-neutral-300">
          <span className="flex items-center gap-1.5">
            <Zap size={14} />
            Sprints
          </span>
        </label>
        <div className="relative" ref={sprintDropdownRef}>
          <div className={`${inputStyles} flex flex-wrap items-center gap-2`}>
            {formData.selectedSprints.map((sprint) => (
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
              className="min-w-30 flex-1 border-none bg-transparent p-0 text-sm focus:outline-none focus:ring-0 dark:text-white"
              placeholder={
                formData.selectedSprints.length === 0
                  ? "Search sprints..."
                  : "Add more..."
              }
              value={sprintSearch}
              onChange={(e) => {
                setSprintSearch(e.target.value);
                setShowSprintDropdown(true);
              }}
              onFocus={() => {
                if (sprintDropdownRef.current) {
                  const rect =
                    sprintDropdownRef.current.getBoundingClientRect();
                  setSprintDropdownPosition({
                    top: rect.bottom + 4,
                    left: rect.left,
                    width: rect.width,
                  });
                }
                setShowSprintDropdown(true);
              }}
            />
          </div>
          {showSprintDropdown &&
            createPortal(
              <div
                ref={sprintPortalDropdownRef}
                className="max-h-48 overflow-auto rounded-md border border-gray-200 bg-white shadow-lg dark:border-dark-tertiary dark:bg-dark-secondary"
                style={{
                  position: "fixed",
                  top: sprintDropdownPosition.top,
                  left: sprintDropdownPosition.left,
                  width: sprintDropdownPosition.width,
                  zIndex: 9999,
                }}
              >
                {filteredSprints.length > 0 ? (
                  filteredSprints.slice(0, 8).map((sprint) => (
                    <button
                      key={sprint.id}
                      type="button"
                      onClick={() => addSprint(sprint)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-dark-tertiary"
                    >
                      <Zap size={14} className="text-purple-500" />
                      <span className="font-medium text-gray-900 dark:text-white">
                        {sprint.title}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                    {activeSprints.length === 0
                      ? "No active sprints available"
                      : "No matching sprints"}
                  </div>
                )}
              </div>,
              document.body,
            )}
        </div>
      </div>

      {/* Assignees */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-neutral-300">
          <span className="flex items-center gap-1.5">
            <Users size={14} />
            Assignees
          </span>
        </label>
        <div className="relative" ref={assigneeDropdownRef}>
          <div className={`${inputStyles} flex flex-wrap items-center gap-1`}>
            {formData.selectedAssignees.map((user) => (
              <span
                key={user.userId}
                className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-sm text-gray-700 dark:bg-gray-700 dark:text-gray-100"
              >
                {user.fullName || user.username}
                <button
                  type="button"
                  onClick={() => removeAssignee(user.userId)}
                  className="ml-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X size={14} />
                </button>
              </span>
            ))}
            <input
              type="text"
              className="min-w-30 flex-1 border-none bg-transparent p-0 text-sm focus:outline-none focus:ring-0 dark:text-white"
              placeholder={
                formData.selectedAssignees.length === 0
                  ? "Search users..."
                  : "Add more..."
              }
              value={assigneeSearch}
              onChange={(e) => {
                setAssigneeSearch(e.target.value);
                setShowAssigneeDropdown(true);
              }}
              onFocus={() => {
                if (assigneeDropdownRef.current) {
                  const rect =
                    assigneeDropdownRef.current.getBoundingClientRect();
                  setAssigneeDropdownPosition({
                    top: rect.bottom + 4,
                    left: rect.left,
                    width: rect.width,
                  });
                }
                setShowAssigneeDropdown(true);
              }}
            />
          </div>
          {showAssigneeDropdown &&
            createPortal(
              <div
                ref={assigneePortalDropdownRef}
                className="max-h-48 overflow-auto rounded-md border border-gray-200 bg-white shadow-lg dark:border-dark-tertiary dark:bg-dark-secondary"
                style={{
                  position: "fixed",
                  top: assigneeDropdownPosition.top,
                  left: assigneeDropdownPosition.left,
                  width: assigneeDropdownPosition.width,
                  zIndex: 9999,
                }}
              >
                {filteredUsers.length > 0 ? (
                  filteredUsers.slice(0, 8).map((user) => (
                    <button
                      key={user.userId}
                      type="button"
                      onClick={() => addAssignee(user)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-dark-tertiary"
                    >
                      <UserIcon
                        userId={user.userId}
                        username={user.username}
                        fullName={user.fullName}
                        profilePictureExt={user.profilePictureExt}
                        size={24}
                      />
                      <span className="font-medium text-gray-900 dark:text-white">
                        {user.fullName || user.username}
                      </span>
                      {user.email && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {user.email}
                        </span>
                      )}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                    No users found
                  </div>
                )}
              </div>,
              document.body,
            )}
        </div>
      </div>

      {/* Dates */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-500 dark:text-neutral-500" />
          <span className="text-sm text-gray-600 dark:text-neutral-400">
            Start:
          </span>
          <div className="relative">
            <button
              ref={startDateRef}
              type="button"
              onClick={() => setShowStartDatePicker(!showStartDatePicker)}
              className="min-w-32.5 rounded border border-gray-300 px-3 py-1.5 text-left text-sm dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white"
            >
              {formData.startDate
                ? format(parseLocalDate(formData.startDate), "MMM d, yyyy")
                : "Select date"}
            </button>
            {showStartDatePicker && (
              <DatePicker
                value={formData.startDate || undefined}
                onChange={(date) => {
                  onChange({ startDate: date || "" });
                  if (
                    date &&
                    formData.dueDate &&
                    parseLocalDate(date) > parseLocalDate(formData.dueDate)
                  ) {
                    onChange({ startDate: date || "", dueDate: "" });
                  }
                  setShowStartDatePicker(false);
                }}
                onClose={() => setShowStartDatePicker(false)}
                anchorRef={startDateRef}
              />
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-500 dark:text-neutral-500" />
          <span className="text-sm text-gray-600 dark:text-neutral-400">
            Due:
          </span>
          <div className="relative">
            <button
              ref={dueDateRef}
              type="button"
              onClick={() => setShowDueDatePicker(!showDueDatePicker)}
              className="min-w-32.5 rounded border border-gray-300 px-3 py-1.5 text-left text-sm dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white"
            >
              {formData.dueDate
                ? format(parseLocalDate(formData.dueDate), "MMM d, yyyy")
                : "Select date"}
            </button>
            {showDueDatePicker && (
              <DatePicker
                value={formData.dueDate || undefined}
                onChange={(date) => {
                  if (
                    date &&
                    formData.startDate &&
                    parseLocalDate(date) < parseLocalDate(formData.startDate)
                  ) {
                    return;
                  }
                  onChange({ dueDate: date || "" });
                  setShowDueDatePicker(false);
                }}
                onClose={() => setShowDueDatePicker(false)}
                minDate={formData.startDate || undefined}
                anchorRef={dueDateRef}
              />
            )}
          </div>
        </div>
      </div>
      {formData.startDate &&
        formData.dueDate &&
        parseLocalDate(formData.dueDate) <
          parseLocalDate(formData.startDate) && (
          <p className="text-xs text-red-500 dark:text-red-400">
            Due date must be after start date
          </p>
        )}

      {/* Attachments */}
      {showAttachments && (
        <div className="border-t border-gray-200 pt-4 dark:border-stroke-dark">
          <div className="mb-3 flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-gray-500 dark:text-neutral-500" />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Attachments
            </span>
            {(formData.pendingFiles?.length ?? 0) > 0 && (
              <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600 dark:bg-dark-tertiary dark:text-gray-400">
                {formData.pendingFiles.length}
              </span>
            )}
          </div>

          {/* Upload button */}
          <div className="mb-3">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              accept={FILE_INPUT_ACCEPT}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-600 transition-colors hover:border-gray-400 hover:bg-gray-50 dark:border-stroke-dark dark:text-neutral-400 dark:hover:border-gray-500 dark:hover:bg-dark-tertiary"
            >
              <Upload size={16} />
              Add file (max {MAX_FILE_SIZE_MB}MB)
            </button>
            {uploadError && (
              <p className="mt-2 text-xs text-red-500 dark:text-red-400">
                {uploadError}
              </p>
            )}
          </div>

          {/* Pending files list */}
          {(formData.pendingFiles?.length ?? 0) > 0 && (
            <div className="space-y-2">
              {formData.pendingFiles.map((pf) => (
                <div
                  key={pf.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-stroke-dark dark:bg-dark-tertiary"
                >
                  <span className="truncate text-sm text-gray-700 dark:text-neutral-300">
                    {pf.fileName}
                  </span>
                  <button
                    type="button"
                    onClick={() => removePendingFile(pf.id)}
                    className="ml-2 rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-red-500 dark:hover:bg-gray-600 dark:hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Render slot before subtasks (e.g. existing attachments) */}
      {renderBeforeSubtasks}

      {/* Subtasks */}
      {showSubtasks && availableSubtasks.length > 0 && (
        <div className="border-t border-gray-200 pt-4 dark:border-stroke-dark">
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
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Subtasks
              </span>
              {(formData.selectedSubtaskIds?.length ?? 0) > 0 && (
                <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600 dark:bg-dark-tertiary dark:text-gray-400">
                  {formData.selectedSubtaskIds.length}
                </span>
              )}
            </div>
            <span className="text-xs text-gray-500 dark:text-neutral-400">
              Click to add/remove
            </span>
          </button>
          {subtasksExpanded && (
            <div className="space-y-2 pl-2">
              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  className="w-full rounded border border-gray-300 py-2 pl-9 pr-3 text-sm dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white dark:focus:outline-none"
                  placeholder="Search tasks..."
                  value={subtaskSearch}
                  onChange={(e) => setSubtaskSearch(e.target.value)}
                />
              </div>
              {/* Selected subtasks */}
              {(formData.selectedSubtaskIds?.length ?? 0) > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    Selected:
                  </p>
                  {availableTasks
                    .filter((t) => formData.selectedSubtaskIds?.includes(t.id))
                    .filter((t) =>
                      t.title
                        .toLowerCase()
                        .includes(subtaskSearch.toLowerCase()),
                    )
                    .map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleSubtask(t.id)}
                        className="flex w-full items-center justify-between rounded-lg border border-blue-500 bg-blue-50 px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-blue-100 dark:border-blue-400 dark:bg-blue-900/30 dark:hover:bg-blue-900/50"
                      >
                        <span className="font-medium dark:text-white">
                          {t.title}
                        </span>
                        <X
                          size={14}
                          className="text-blue-500 dark:text-blue-400"
                        />
                      </button>
                    ))}
                </div>
              )}
              {/* Available tasks */}
              {availableSubtasks
                .filter((t) => !formData.selectedSubtaskIds?.includes(t.id))
                .filter((t) =>
                  t.title.toLowerCase().includes(subtaskSearch.toLowerCase()),
                ).length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    Available:
                  </p>
                  {availableSubtasks
                    .filter((t) => !formData.selectedSubtaskIds?.includes(t.id))
                    .filter((t) =>
                      t.title
                        .toLowerCase()
                        .includes(subtaskSearch.toLowerCase()),
                    )
                    .map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleSubtask(t.id)}
                        className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-gray-50 dark:border-stroke-dark dark:bg-dark-tertiary dark:hover:bg-gray-700"
                      >
                        <span className="font-medium dark:text-white">
                          {t.title}
                        </span>
                        <Plus size={14} className="text-gray-400" />
                      </button>
                    ))}
                </div>
              )}
              {/* No results message */}
              {subtaskSearch &&
                availableSubtasks.filter((t) =>
                  t.title.toLowerCase().includes(subtaskSearch.toLowerCase()),
                ).length === 0 && (
                  <p className="py-2 text-center text-sm text-gray-500 dark:text-gray-400">
                    No tasks match &quot;{subtaskSearch}&quot;
                  </p>
                )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
