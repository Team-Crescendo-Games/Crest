import Modal from "@/components/Modal";
import DatePicker from "@/components/DatePicker";
import ProjectSelector from "@/components/ProjectSelector";
import {
  Priority,
  Status,
  useCreateTaskMutation,
  useGetTagsQuery,
  useGetUsersQuery,
  useGetProjectsQuery,
  useGetSprintsQuery,
  User,
  Project,
  Sprint,
} from "@/state/api";
import { useAuthUser } from "@/lib/useAuthUser";
import { PRIORITY_BADGE_STYLES } from "@/lib/priorityColors";
import { STATUS_BADGE_STYLES } from "@/lib/statusColors";
import { parseLocalDate } from "@/lib/dateUtils";
import { useState, useEffect, useRef } from "react";
import { formatISO, format } from "date-fns";
import { X, Zap, Flag, Award, Tag, Calendar } from "lucide-react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  projectId?: number | null;
  sprintId?: number | null;
  defaultAssigneeId?: number | null;
};

const ModalNewTask = ({
  isOpen,
  onClose,
  projectId = null,
  sprintId = null,
  defaultAssigneeId = null,
}: Props) => {
  const [createTask, { isLoading }] = useCreateTaskMutation();
  const { data: availableTags } = useGetTagsQuery();
  const { data: users = [] } = useGetUsersQuery();
  const { data: projects = [] } = useGetProjectsQuery();
  const { data: sprints = [] } = useGetSprintsQuery();
  const { data: authData } = useAuthUser();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Status>(Status.InputQueue);
  const [priority, setPriority] = useState<Priority>(Priority.Backlog);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [selectedSprintIds, setSelectedSprintIds] = useState<number[]>([]);
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedAssignees, setSelectedAssignees] = useState<User[]>([]);
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedSprints, setSelectedSprints] = useState<Sprint[]>([]);
  const [sprintSearch, setSprintSearch] = useState("");
  const [showSprintDropdown, setShowSprintDropdown] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);

  const assigneeInputRef = useRef<HTMLInputElement>(null);
  const assigneeDropdownRef = useRef<HTMLDivElement>(null);
  const sprintDropdownRef = useRef<HTMLDivElement>(null);
  const startDateRef = useRef<HTMLDivElement>(null);
  const dueDateRef = useRef<HTMLDivElement>(null);

  // Set defaults when modal opens
  useEffect(() => {
    if (isOpen) {
      // Set start date to today
      setStartDate(format(new Date(), "yyyy-MM-dd"));

      // Reset form
      setTitle("");
      setDescription("");
      setStatus(Status.InputQueue);
      setPriority(Priority.Backlog);
      setSelectedTagIds([]);
      setDueDate("");
      setAssigneeSearch("");
      setSprintSearch("");

      // Pre-fill assignee if defaultAssigneeId is provided
      if (defaultAssigneeId && users.length > 0) {
        const defaultUser = users.find((u) => u.userId === defaultAssigneeId);
        if (defaultUser) {
          setSelectedAssignees([defaultUser]);
        } else {
          setSelectedAssignees([]);
        }
      } else {
        setSelectedAssignees([]);
      }

      // Pre-fill project if projectId is provided
      if (projectId && projects.length > 0) {
        const project = projects.find((p) => p.id === projectId);
        if (project) {
          setSelectedProject(project);
        } else {
          setSelectedProject(null);
        }
      } else {
        setSelectedProject(null);
      }

      // Pre-fill sprint if sprintId is provided
      if (sprintId && sprints.length > 0) {
        const sprint = sprints.find((s) => s.id === sprintId);
        if (sprint) {
          setSelectedSprints([sprint]);
          setSelectedSprintIds([sprint.id]);
        } else {
          setSelectedSprints([]);
          setSelectedSprintIds([]);
        }
      } else {
        setSelectedSprints([]);
        setSelectedSprintIds([]);
      }
    }
  }, [
    isOpen,
    projectId,
    sprintId,
    defaultAssigneeId,
    projects,
    sprints,
    users,
  ]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        assigneeDropdownRef.current &&
        !assigneeDropdownRef.current.contains(event.target as Node)
      ) {
        setShowAssigneeDropdown(false);
      }
      if (
        sprintDropdownRef.current &&
        !sprintDropdownRef.current.contains(event.target as Node)
      ) {
        setShowSprintDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleTag = (tagId: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId],
    );
  };

  const filteredUsers = users.filter((user) => {
    const searchLower = assigneeSearch.toLowerCase().replace("@", "");
    const matchesSearch =
      user.username.toLowerCase().includes(searchLower) ||
      (user.email?.toLowerCase().includes(searchLower) ?? false);
    const notAlreadySelected = !selectedAssignees.some(
      (a) => a.userId === user.userId,
    );
    return matchesSearch && notAlreadySelected;
  });

  const filteredSprints = sprints.filter((sprint) => {
    const searchLower = sprintSearch.toLowerCase();
    const matchesSearch = sprint.title.toLowerCase().includes(searchLower);
    const notAlreadySelected = !selectedSprints.some((s) => s.id === sprint.id);
    return matchesSearch && notAlreadySelected;
  });

  const addAssignee = (user: User) => {
    setSelectedAssignees((prev) => [...prev, user]);
    setAssigneeSearch("");
    setShowAssigneeDropdown(false);
  };

  const removeAssignee = (userId: number | undefined) => {
    setSelectedAssignees((prev) => prev.filter((a) => a.userId !== userId));
  };

  const addSprint = (sprint: Sprint) => {
    setSelectedSprints((prev) => [...prev, sprint]);
    setSelectedSprintIds((prev) => [...prev, sprint.id]);
    setSprintSearch("");
    setShowSprintDropdown(false);
  };

  const removeSprint = (sprintId: number) => {
    setSelectedSprints((prev) => prev.filter((s) => s.id !== sprintId));
    setSelectedSprintIds((prev) => prev.filter((id) => id !== sprintId));
  };

  const handleSubmit = async () => {
    const authorUserId = authData?.userDetails?.userId;
    const finalProjectId = selectedProject?.id;

    if (!title || !authorUserId || !finalProjectId) return;

    const formattedStartDate = startDate
      ? formatISO(new Date(startDate), {
          representation: "complete",
        })
      : undefined;
    const formattedDueDate = dueDate
      ? formatISO(new Date(dueDate), {
          representation: "complete",
        })
      : undefined;

    await createTask({
      title,
      description,
      status,
      priority,
      startDate: formattedStartDate,
      dueDate: formattedDueDate,
      authorUserId,
      projectId: finalProjectId,
      tagIds: selectedTagIds,
      sprintIds: selectedSprintIds,
      assigneeIds: selectedAssignees
        .map((a) => a.userId)
        .filter((id): id is number => id !== undefined),
    });

    onClose();
  };

  const isFormValid = () => {
    const authorUserId = authData?.userDetails?.userId;
    return title && authorUserId && selectedProject;
  };

  const inputStyles =
    "w-full rounded border border-gray-300 p-2 shadow-sm dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white dark:focus:outline-none";

  return (
    <Modal isOpen={isOpen} onClose={onClose} name="Create New Task">
      <form
        className="mt-4 space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <input
          type="text"
          className={inputStyles}
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className={inputStyles}
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {/* Status */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-neutral-300">
            <span className="flex items-center gap-1.5">
              <Award size={14} />
              Status
            </span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {Object.values(Status).map((s) => {
              const isSelected = status === s;
              const colors =
                STATUS_BADGE_STYLES[s] || STATUS_BADGE_STYLES["Input Queue"];
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-all ${colors.bg} ${colors.text} ${colors.darkBg} ${colors.darkText} ${
                    isSelected
                      ? "dark:ring-offset-dark-bg ring-2 ring-gray-800 ring-offset-1 dark:ring-white"
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
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-neutral-300">
            <span className="flex items-center gap-1.5">
              <Flag size={14} />
              Priority
            </span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {Object.values(Priority).map((p) => {
              const isSelected = priority === p;
              const colors =
                PRIORITY_BADGE_STYLES[p] || PRIORITY_BADGE_STYLES.Backlog;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-all ${colors.bg} ${colors.text} ${colors.darkBg} ${colors.darkText} ${
                    isSelected
                      ? "dark:ring-offset-dark-bg ring-2 ring-gray-800 ring-offset-1 dark:ring-white"
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
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-neutral-300">
            <span className="flex items-center gap-1.5">
              <Tag size={14} />
              Tags
            </span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {availableTags?.map((tag) => {
              const isSelected = selectedTagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold text-white transition-all ${
                    isSelected
                      ? "dark:ring-offset-dark-bg ring-2 ring-gray-800 ring-offset-1 dark:ring-white"
                      : "opacity-40 hover:opacity-70"
                  }`}
                  style={{
                    backgroundColor: tag.color || "#3b82f6",
                  }}
                >
                  {tag.name}
                </button>
              );
            })}
            {(!availableTags || availableTags.length === 0) && (
              <p className="text-xs text-gray-400">No tags available</p>
            )}
          </div>
        </div>

        {/* Sprints */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-neutral-300">
            <span className="flex items-center gap-1.5">
              <Zap size={14} />
              Sprints
            </span>
          </label>
          <div className="relative" ref={sprintDropdownRef}>
            <div
              className={`${inputStyles} flex min-h-[42px] flex-wrap items-center gap-2`}
            >
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
                className="min-w-[120px] flex-1 border-none bg-transparent p-0 text-sm focus:ring-0 focus:outline-none dark:text-white"
                placeholder={
                  selectedSprints.length === 0
                    ? "Search sprints..."
                    : "Add more..."
                }
                value={sprintSearch}
                onChange={(e) => {
                  setSprintSearch(e.target.value);
                  setShowSprintDropdown(true);
                }}
                onFocus={() => setShowSprintDropdown(true)}
              />
            </div>
            {showSprintDropdown && (
              <div className="dark:border-dark-tertiary dark:bg-dark-secondary absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
                {filteredSprints.length > 0 ? (
                  filteredSprints.slice(0, 8).map((sprint) => (
                    <button
                      key={sprint.id}
                      type="button"
                      onClick={() => addSprint(sprint)}
                      className="dark:hover:bg-dark-tertiary flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-100"
                    >
                      <Zap size={14} className="text-purple-500" />
                      <span className="font-medium text-gray-900 dark:text-white">
                        {sprint.title}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                    {sprints.length === 0
                      ? "No sprints available"
                      : "No matching sprints"}
                  </div>
                )}
              </div>
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
            <div ref={startDateRef} className="relative">
              <button
                type="button"
                onClick={() => setShowStartDatePicker(!showStartDatePicker)}
                className="dark:border-dark-tertiary dark:bg-dark-tertiary min-w-[130px] rounded border border-gray-300 px-3 py-1.5 text-left text-sm dark:text-white"
              >
                {startDate
                  ? format(parseLocalDate(startDate), "MMM d, yyyy")
                  : "Select date"}
              </button>
              {showStartDatePicker && (
                <div className="absolute z-20 mt-1">
                  <DatePicker
                    value={startDate || undefined}
                    onChange={(date) => {
                      setStartDate(date || "");
                      if (
                        date &&
                        dueDate &&
                        parseLocalDate(date) > parseLocalDate(dueDate)
                      ) {
                        setDueDate("");
                      }
                      setShowStartDatePicker(false);
                    }}
                    onClose={() => setShowStartDatePicker(false)}
                  />
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500 dark:text-neutral-500" />
            <span className="text-sm text-gray-600 dark:text-neutral-400">
              Due:
            </span>
            <div ref={dueDateRef} className="relative">
              <button
                type="button"
                onClick={() => setShowDueDatePicker(!showDueDatePicker)}
                className="dark:border-dark-tertiary dark:bg-dark-tertiary min-w-[130px] rounded border border-gray-300 px-3 py-1.5 text-left text-sm dark:text-white"
              >
                {dueDate
                  ? format(parseLocalDate(dueDate), "MMM d, yyyy")
                  : "Select date"}
              </button>
              {showDueDatePicker && (
                <div className="absolute z-20 mt-1">
                  <DatePicker
                    value={dueDate || undefined}
                    onChange={(date) => {
                      if (
                        date &&
                        startDate &&
                        parseLocalDate(date) < parseLocalDate(startDate)
                      ) {
                        return;
                      }
                      setDueDate(date || "");
                      setShowDueDatePicker(false);
                    }}
                    onClose={() => setShowDueDatePicker(false)}
                    minDate={startDate || undefined}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Date validation message */}
        {startDate &&
          dueDate &&
          parseLocalDate(dueDate) < parseLocalDate(startDate) && (
            <p className="text-xs text-red-500 dark:text-red-400">
              Due date must be after start date
            </p>
          )}

        {/* Author (read-only, auto-filled) */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-neutral-300">
            Author
          </label>
          <div
            className={`${inputStyles} dark:bg-dark-tertiary/50 cursor-not-allowed bg-gray-50`}
          >
            {authData?.userDetails?.username || "Loading..."}
          </div>
        </div>

        {/* Assignees with tag-like selection */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-neutral-300">
            Assignees
          </label>
          <div className="relative" ref={assigneeDropdownRef}>
            <div
              className={`${inputStyles} flex min-h-[42px] flex-wrap items-center gap-2`}
            >
              {selectedAssignees.map((user) => (
                <span
                  key={user.userId}
                  className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                >
                  @{user.username}
                  <button
                    type="button"
                    onClick={() => removeAssignee(user.userId)}
                    className="ml-0.5 hover:text-blue-600 dark:hover:text-blue-200"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
              <input
                ref={assigneeInputRef}
                type="text"
                className="min-w-[120px] flex-1 border-none bg-transparent p-0 text-sm focus:ring-0 focus:outline-none dark:text-white"
                placeholder={
                  selectedAssignees.length === 0
                    ? "Type @ to search users..."
                    : "Add more..."
                }
                value={assigneeSearch}
                onChange={(e) => {
                  setAssigneeSearch(e.target.value);
                  setShowAssigneeDropdown(true);
                }}
                onFocus={() => setShowAssigneeDropdown(true)}
              />
            </div>
            {showAssigneeDropdown && (
              <div className="dark:border-dark-tertiary dark:bg-dark-secondary absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
                {filteredUsers.length > 0 ? (
                  filteredUsers.slice(0, 8).map((user) => (
                    <button
                      key={user.userId}
                      type="button"
                      onClick={() => addAssignee(user)}
                      className="dark:hover:bg-dark-tertiary flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-100"
                    >
                      <span className="font-medium text-gray-900 dark:text-white">
                        @{user.username}
                      </span>
                      {user.email && (
                        <span className="text-gray-500 dark:text-gray-400">
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
              </div>
            )}
          </div>
        </div>

        {/* Project selection */}
        <ProjectSelector
          projects={projects}
          selectedProject={selectedProject}
          onSelect={setSelectedProject}
          label="Project"
          placeholder="Search projects..."
          inputClassName={inputStyles}
          showIcon={false}
        />

        <button
          type="submit"
          className={`focus-offset-2 mt-4 flex w-full justify-center rounded-md border border-transparent bg-gray-800 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-gray-700 focus:ring-2 focus:ring-gray-600 focus:outline-none dark:bg-white dark:text-gray-800 dark:hover:bg-gray-200 ${
            !isFormValid() || isLoading ? "cursor-not-allowed opacity-50" : ""
          }`}
          disabled={!isFormValid() || isLoading}
        >
          {isLoading ? "Creating..." : "Create Task"}
        </button>
      </form>
    </Modal>
  );
};

export default ModalNewTask;
