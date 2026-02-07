import Modal from "@/components/Modal";
import { Priority, Status, useCreateTaskMutation, useGetTagsQuery } from "@/state/api";
import { useState } from "react";
import { formatISO } from "date-fns";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    id?: string | null;
};

const ModalNewTask = ({ isOpen, onClose, id = null }: Props) => {
    const [createTask, { isLoading }] = useCreateTaskMutation();
    const { data: availableTags } = useGetTagsQuery();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [status, setStatus] = useState<Status>(Status.InputQueue);
    const [priority, setPriority] = useState<Priority>(Priority.Backlog);
    const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
    const [startDate, setStartDate] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [authorUserId, setAuthorUserId] = useState("");
    const [assignedUserId, setAssignedUserId] = useState("");
    const [projectId, setProjectId] = useState("");

    const toggleTag = (tagId: number) => {
        setSelectedTagIds((prev) =>
            prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
        );
    };

    const handleSubmit = async () => {
        if (!title || !authorUserId || !(id !== null || projectId)) return;

        const formattedStartDate = formatISO(new Date(startDate), {
            representation: "complete",
        });
        const formattedDueDate = formatISO(new Date(dueDate), {
            representation: "complete",
        });

        await createTask({
            title,
            description,
            status,
            priority,
            startDate: formattedStartDate,
            dueDate: formattedDueDate,
            authorUserId: parseInt(authorUserId),
            assignedUserId: parseInt(assignedUserId),
            projectId: id !== null ? Number(id) : Number(projectId),
            tagIds: selectedTagIds,
        });

        onClose();
    };

    const isFormValid = () => {
        return title && authorUserId && (id !== null || projectId);
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

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-2">
                    <input
                        type="date"
                        className={inputStyles}
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                    />
                    <input
                        type="date"
                        className={inputStyles}
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                    />
                </div>
                <input
                    type="text"
                    className={inputStyles}
                    placeholder="Author User ID"
                    value={authorUserId}
                    onChange={(e) => setAuthorUserId(e.target.value)}
                />
                <input
                    type="text"
                    className={inputStyles}
                    placeholder="Assigned User ID"
                    value={assignedUserId}
                    onChange={(e) => setAssignedUserId(e.target.value)}
                />
                {id === null && (
                    <input
                        type="text"
                        className={inputStyles}
                        placeholder="ProjectId"
                        value={projectId}
                        onChange={(e) => setProjectId(e.target.value)}
                    />
                )}
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
