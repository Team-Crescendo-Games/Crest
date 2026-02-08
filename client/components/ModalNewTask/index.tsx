import Modal from "@/components/Modal";
import { Priority, Status, useCreateTaskMutation, useGetTagsQuery, useGetUsersQuery, useGetProjectsQuery, useGetAuthUserQuery, useGetSprintsQuery, User, Project, Sprint } from "@/state/api";
import { useState, useEffect, useRef } from "react";
import { formatISO, format } from "date-fns";
import { X, ChevronDown, Zap } from "lucide-react";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    projectId?: number | null;
    sprintId?: number | null;
    defaultAssigneeId?: number | null;
};

const ModalNewTask = ({ isOpen, onClose, projectId = null, sprintId = null, defaultAssigneeId = null }: Props) => {
    const [createTask, { isLoading }] = useCreateTaskMutation();
    const { data: availableTags } = useGetTagsQuery();
    const { data: users = [] } = useGetUsersQuery();
    const { data: projects = [] } = useGetProjectsQuery();
    const { data: sprints = [] } = useGetSprintsQuery();
    const { data: authData } = useGetAuthUserQuery({});
    
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
    const [projectSearch, setProjectSearch] = useState("");
    const [showProjectDropdown, setShowProjectDropdown] = useState(false);
    const [selectedSprints, setSelectedSprints] = useState<Sprint[]>([]);
    const [sprintSearch, setSprintSearch] = useState("");
    const [showSprintDropdown, setShowSprintDropdown] = useState(false);
    
    const assigneeInputRef = useRef<HTMLInputElement>(null);
    const projectInputRef = useRef<HTMLInputElement>(null);
    const assigneeDropdownRef = useRef<HTMLDivElement>(null);
    const projectDropdownRef = useRef<HTMLDivElement>(null);
    const sprintDropdownRef = useRef<HTMLDivElement>(null);

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
            setProjectSearch("");
            setSprintSearch("");
            
            // Pre-fill assignee if defaultAssigneeId is provided
            if (defaultAssigneeId && users.length > 0) {
                const defaultUser = users.find(u => u.userId === defaultAssigneeId);
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
                const project = projects.find(p => p.id === projectId);
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
                const sprint = sprints.find(s => s.id === sprintId);
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
    }, [isOpen, projectId, sprintId, defaultAssigneeId, projects, sprints, users]);

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

    const toggleTag = (tagId: number) => {
        setSelectedTagIds((prev) =>
            prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
        );
    };

    const filteredUsers = users.filter(user => {
        const searchLower = assigneeSearch.toLowerCase().replace("@", "");
        const matchesSearch = user.username.toLowerCase().includes(searchLower) ||
            (user.email?.toLowerCase().includes(searchLower) ?? false);
        const notAlreadySelected = !selectedAssignees.some(a => a.userId === user.userId);
        return matchesSearch && notAlreadySelected;
    });

    const filteredProjects = projects.filter(project => {
        const searchLower = projectSearch.toLowerCase();
        return project.name.toLowerCase().includes(searchLower);
    });

    const filteredSprints = sprints.filter(sprint => {
        const searchLower = sprintSearch.toLowerCase();
        const matchesSearch = sprint.title.toLowerCase().includes(searchLower);
        const notAlreadySelected = !selectedSprints.some(s => s.id === sprint.id);
        return matchesSearch && notAlreadySelected;
    });

    const addAssignee = (user: User) => {
        setSelectedAssignees(prev => [...prev, user]);
        setAssigneeSearch("");
        setShowAssigneeDropdown(false);
    };

    const removeAssignee = (userId: number | undefined) => {
        setSelectedAssignees(prev => prev.filter(a => a.userId !== userId));
    };

    const selectProject = (project: Project) => {
        setSelectedProject(project);
        setProjectSearch("");
        setShowProjectDropdown(false);
    };

    const addSprint = (sprint: Sprint) => {
        setSelectedSprints(prev => [...prev, sprint]);
        setSelectedSprintIds(prev => [...prev, sprint.id]);
        setSprintSearch("");
        setShowSprintDropdown(false);
    };

    const removeSprint = (sprintId: number) => {
        setSelectedSprints(prev => prev.filter(s => s.id !== sprintId));
        setSelectedSprintIds(prev => prev.filter(id => id !== sprintId));
    };

    const handleSubmit = async () => {
        const authorUserId = authData?.userDetails?.userId;
        const finalProjectId = selectedProject?.id;
        
        if (!title || !authorUserId || !finalProjectId) return;

        const formattedStartDate = startDate ? formatISO(new Date(startDate), {
            representation: "complete",
        }) : undefined;
        const formattedDueDate = dueDate ? formatISO(new Date(dueDate), {
            representation: "complete",
        }) : undefined;

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
            assigneeIds: selectedAssignees.map(a => a.userId).filter((id): id is number => id !== undefined),
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
                        Status
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {Object.values(Status).map((s) => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => setStatus(s)}
                                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                                    status === s
                                        ? "bg-gray-800 text-white dark:bg-white dark:text-gray-800"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-dark-tertiary dark:text-neutral-300 dark:hover:bg-dark-surface"
                                }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Priority */}
                <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-neutral-300">
                        Priority
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {Object.values(Priority).map((p) => (
                            <button
                                key={p}
                                type="button"
                                onClick={() => setPriority(p)}
                                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                                    priority === p
                                        ? "bg-gray-800 text-white dark:bg-white dark:text-gray-800"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-dark-tertiary dark:text-neutral-300 dark:hover:bg-dark-surface"
                                }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tags */}
                <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-neutral-300">
                        Tags
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {availableTags?.map((tag) => {
                            const isSelected = selectedTagIds.includes(tag.id);
                            return (
                                <button
                                    key={tag.id}
                                    type="button"
                                    onClick={() => toggleTag(tag.id)}
                                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                                        isSelected
                                            ? "bg-gray-800 text-white dark:bg-white dark:text-gray-800"
                                            : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-dark-tertiary dark:text-neutral-300 dark:hover:bg-dark-surface"
                                    }`}
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
                        <div className={`${inputStyles} flex flex-wrap gap-2 min-h-[42px] items-center`}>
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
                                        {sprints.length === 0 ? "No sprints available" : "No matching sprints"}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-2">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-neutral-300">
                            Start Date
                        </label>
                        <input
                            type="date"
                            className={inputStyles}
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-neutral-300">
                            Due Date
                        </label>
                        <input
                            type="date"
                            className={inputStyles}
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                        />
                    </div>
                </div>

                {/* Author (read-only, auto-filled) */}
                <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-neutral-300">
                        Author
                    </label>
                    <div className={`${inputStyles} bg-gray-50 dark:bg-dark-tertiary/50 cursor-not-allowed`}>
                        {authData?.userDetails?.username || "Loading..."}
                    </div>
                </div>

                {/* Assignees with tag-like selection */}
                <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-neutral-300">
                        Assignees
                    </label>
                    <div className="relative" ref={assigneeDropdownRef}>
                        <div className={`${inputStyles} flex flex-wrap gap-2 min-h-[42px] items-center`}>
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
                            <div
                                className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg dark:border-dark-tertiary dark:bg-dark-secondary"
                            >
                                {filteredUsers.length > 0 ? (
                                    filteredUsers.slice(0, 8).map((user) => (
                                        <button
                                            key={user.userId}
                                            type="button"
                                            onClick={() => addAssignee(user)}
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
                    </div>
                </div>

                {/* Project selection */}
                <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-neutral-300">
                        Project
                    </label>
                    <div className="relative" ref={projectDropdownRef}>
                        {selectedProject ? (
                            <div className={`${inputStyles} flex items-center justify-between`}>
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
                                        ref={projectInputRef}
                                        type="text"
                                        className={inputStyles}
                                        placeholder="Search projects..."
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
                                    <div
                                        className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg dark:border-dark-tertiary dark:bg-dark-secondary"
                                    >
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
                                                No projects found
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                <button
                    type="submit"
                    className={`focus-offset-2 mt-4 flex w-full justify-center rounded-md border border-transparent bg-gray-800 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-600 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-200 ${
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
