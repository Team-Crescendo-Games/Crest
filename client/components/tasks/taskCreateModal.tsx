"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/Modal";
import TaskForm, { TaskFormData } from "@/components/tasks/taskForm"; 
import {
  Priority,
  Status,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useGetTagsQuery,
  useGetUsersQuery,
  useGetBoardsQuery, // REPLACED: Projects -> Boards
  useGetSprintsQuery,
  useGetTasksQuery,
  useGetPresignedUploadUrlMutation,
  useCreateAttachmentMutation,
  useDeleteAttachmentMutation,
  User,
  Sprint,
} from "@/state/api";
import { useAuthUser } from "@/lib/useAuthUser";
import { useWorkspace } from "@/lib/useWorkspace"; // ADDED
import { formatISO, format } from "date-fns";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  boardId?: number | null; // REPLACED: projectId -> boardId
  sprintId?: number | null;
  defaultAssigneeId?: number | null;
  onTaskCreated?: (taskId: number) => void;
};

export default function TaskCreateModal({
  isOpen,
  onClose,
  boardId = null,
  sprintId = null,
  defaultAssigneeId = null,
  onTaskCreated,
}: Props) {
  const { activeWorkspaceId } = useWorkspace(); // Get the current workspace

  const [createTask, { isLoading }] = useCreateTaskMutation();
  const [updateTask] = useUpdateTaskMutation();

  // Scoped queries to the active workspace
  const { data: availableTags = [] } = useGetTagsQuery(activeWorkspaceId!, {
    skip: !activeWorkspaceId,
  });
  const { data: boards = [] } = useGetBoardsQuery(activeWorkspaceId!, {
    skip: !activeWorkspaceId,
  });
  const { data: sprints = [] } = useGetSprintsQuery(activeWorkspaceId!, {
    skip: !activeWorkspaceId,
  });

  // Users are currently fetched globally, but you might want to scope this to workspace members later!
  const { data: users = [] } = useGetUsersQuery();
  const { data: authData } = useAuthUser();

  const [getPresignedUploadUrl] = useGetPresignedUploadUrlMutation();
  const [createAttachment] = useCreateAttachmentMutation();
  const [deleteAttachment] = useDeleteAttachmentMutation();

  // Fetch tasks for subtask selection when a board is selected
  const [selectedBoardIdForTasks, setSelectedBoardIdForTasks] = useState<
    number | null
  >(null);
  const { data: availableTasks = [] } = useGetTasksQuery(
    { boardId: selectedBoardIdForTasks! },
    { skip: !selectedBoardIdForTasks },
  );

  const [isUploading, setIsUploading] = useState(false);

  const [formData, setFormData] = useState<TaskFormData>({
    title: "",
    description: "",
    status: Status.InputQueue,
    priority: Priority.Backlog,
    startDate: "",
    dueDate: "",
    points: "",
    selectedTagIds: [],
    selectedAssignees: [],
    selectedBoard: null, // REPLACED: selectedProject -> selectedBoard
    selectedSprints: [],
    selectedSubtaskIds: [],
    pendingFiles: [],
  });

  // Update board ID for task fetching when board changes
  useEffect(() => {
    setSelectedBoardIdForTasks(formData.selectedBoard?.id || null);
  }, [formData.selectedBoard]);

  // Set defaults when modal opens
  useEffect(() => {
    if (isOpen) {
      const today = format(new Date(), "yyyy-MM-dd");
      const defaultAssignees =
        defaultAssigneeId && users.length > 0
          ? users.filter((u) => u.userId === defaultAssigneeId)
          : [];

      const defaultBoard =
        boardId && boards.length > 0
          ? boards.find((b) => b.id === boardId && b.isActive) || null
          : null;

      const defaultSprints =
        sprintId && sprints.length > 0
          ? sprints.filter((s) => s.id === sprintId && s.isActive)
          : [];

      setFormData({
        title: "",
        description: "",
        status: Status.InputQueue,
        priority: Priority.Backlog,
        startDate: today,
        dueDate: "",
        points: "",
        selectedTagIds: [],
        selectedAssignees: defaultAssignees,
        selectedBoard: defaultBoard,
        selectedSprints: defaultSprints,
        selectedSubtaskIds: [],
        pendingFiles: [],
      });
    }
  }, [isOpen, boardId, sprintId, defaultAssigneeId, boards, sprints, users]);

  const handleFormChange = (changes: Partial<TaskFormData>) => {
    setFormData((prev: TaskFormData) => ({ ...prev, ...changes }));
  };

  const handleSubmit = async () => {
    const authorUserId = authData?.userDetails?.userId;
    const finalBoardId = formData.selectedBoard?.id;

    if (!formData.title || !authorUserId || !finalBoardId) return;

    const formattedStartDate = formData.startDate
      ? formatISO(new Date(formData.startDate), { representation: "complete" })
      : undefined;
    const formattedDueDate = formData.dueDate
      ? formatISO(new Date(formData.dueDate), { representation: "complete" })
      : undefined;

    const newTask = await createTask({
      title: formData.title,
      description: formData.description,
      status: formData.status,
      priority: formData.priority,
      startDate: formattedStartDate,
      dueDate: formattedDueDate,
      points: formData.points ? Number(formData.points) : undefined,
      authorUserId,
      boardId: finalBoardId,
      tagIds: formData.selectedTagIds,
      sprintIds: formData.selectedSprints.map((s: Sprint) => s.id),
      assigneeIds: formData.selectedAssignees
        .map((a: User) => a.userId)
        .filter((id: number | undefined): id is number => id !== undefined),
    }).unwrap();

    if (formData.selectedSubtaskIds && formData.selectedSubtaskIds.length > 0) {
      await updateTask({
        id: newTask.id,
        subtaskIds: formData.selectedSubtaskIds,
        userId: authorUserId,
      });
    }

    if (formData.pendingFiles && formData.pendingFiles.length > 0) {
      setIsUploading(true);
      for (const pf of formData.pendingFiles) {
        let attachmentId: number | null = null;
        try {
          const attachment = await createAttachment({
            taskId: newTask.id,
            uploadedById: authorUserId,
            fileName: pf.fileName,
            fileExt: pf.fileExt,
          }).unwrap();

          attachmentId = attachment.id;
          const s3Key = `tasks/${newTask.id}/attachments/${attachment.id}.${pf.fileExt}`;

          const { url } = await getPresignedUploadUrl({
            key: s3Key,
            contentType: pf.file.type || "application/octet-stream",
          }).unwrap();

          const uploadResponse = await fetch(url, {
            method: "PUT",
            body: pf.file,
            headers: {
              "Content-Type": pf.file.type || "application/octet-stream",
            },
          });

          if (!uploadResponse.ok)
            throw new Error("Failed to upload file to S3");
          attachmentId = null;
        } catch (error) {
          console.error("File upload error:", error);
          if (attachmentId) {
            try {
              await deleteAttachment(attachmentId);
            } catch {
              /* ignore */
            }
          }
        }
      }
      setIsUploading(false);
    }

    onTaskCreated?.(newTask.id);
    onClose();
  };

  const isFormValid = () => {
    const authorUserId = authData?.userDetails?.userId;
    return formData.title && authorUserId && formData.selectedBoard;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} name="Create New Task">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <TaskForm
          formData={formData}
          onChange={handleFormChange}
          users={users}
          boards={boards} // REPLACED: projects -> boards
          sprints={sprints}
          tags={availableTags}
          showPoints={true}
          filterActiveOnly={true}
          showSubtasks={true}
          showAttachments={true}
          availableTasks={availableTasks}
        />

        <button
          type="submit"
          className={`focus-offset-2 mt-4 flex w-full justify-center rounded-md border border-transparent bg-gray-800 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-600 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-200 ${
            !isFormValid() || isLoading || isUploading
              ? "cursor-not-allowed opacity-50"
              : ""
          }`}
          disabled={!isFormValid() || isLoading || isUploading}
        >
          {isLoading || isUploading ? "Creating..." : "Create Task"}
        </button>
      </form>
    </Modal>
  );
}
