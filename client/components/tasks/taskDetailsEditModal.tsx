"use client";

import { useState, useEffect, useMemo } from "react";
import { Paperclip, Trash2 } from "lucide-react";
import Modal from "@/components/Modal";
import TaskForm, { TaskFormData } from "@/components/tasks/taskForm";
import { localDateToUTC, utcToDateInputValue } from "@/lib/dateUtils";
import {
  Task,
  Priority,
  Status,
  useUpdateTaskMutation,
  useGetTagsQuery,
  useGetWorkspaceMembersQuery,
  useGetBoardsQuery,
  useGetSprintsQuery,
  useGetTasksQuery,
  useGetPresignedUploadUrlMutation,
  useCreateAttachmentMutation,
  useDeleteAttachmentMutation,
  User,
  Sprint,
} from "@/state/api";
import { useAuthUser } from "@/lib/useAuthUser";
import { useWorkspace } from "@/lib/useWorkspace";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onSave?: (task: Task) => void;
};

const TaskDetailsEditModal = ({ isOpen, onClose, task, onSave }: Props) => {
  const { activeWorkspaceId } = useWorkspace();

  const [updateTask, { isLoading }] = useUpdateTaskMutation();

  // Scope queries to the active workspace
  const { data: availableTags = [] } = useGetTagsQuery(activeWorkspaceId!, {
    skip: !activeWorkspaceId,
  });
  const { data: boards = [] } = useGetBoardsQuery(activeWorkspaceId!, {
    skip: !activeWorkspaceId,
  });
  const { data: sprints = [] } = useGetSprintsQuery(activeWorkspaceId!, {
    skip: !activeWorkspaceId,
  });
  const { data: workspaceMembers = [] } = useGetWorkspaceMembersQuery(
    activeWorkspaceId!,
    {
      skip: !activeWorkspaceId,
    },
  );
  const users = useMemo(
    () =>
      workspaceMembers
        .map((m) => m.user)
        .filter((u): u is User => u !== undefined),
    [workspaceMembers],
  );

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
  const [pendingAttachmentDeletions, setPendingAttachmentDeletions] = useState<
    number[]
  >([]);

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
    selectedBoard: null,
    selectedSprints: [],
    selectedSubtaskIds: [],
    pendingFiles: [],
  });

  // Update board ID for task fetching when board changes
  useEffect(() => {
    setSelectedBoardIdForTasks(formData.selectedBoard?.id || null);
  }, [formData.selectedBoard]);

  // Reset form to original task data
  const resetForm = () => {
    if (!task) return;
    const assignees: User[] =
      task.taskAssignments?.map((ta) => {
        const fullUser = users.find((u) => u.userId === ta.user.userId);
        return (
          fullUser || {
            userId: ta.user.userId,
            username: ta.user.username,
            email: "",
            profilePictureExt: ta.user.profilePictureExt,
          }
        );
      }) || [];

    const board = boards.find((b) => b.id === task.boardId) || null;

    const taskSprints: Sprint[] =
      task.sprints
        ?.map((s) => sprints.find((sp) => sp.id === s.id))
        .filter((s): s is Sprint => s !== undefined) || [];

    setFormData({
      title: task.title,
      description: task.description || "",
      status: (task.status as Status) || Status.InputQueue,
      priority: (task.priority as Priority) || Priority.Backlog,
      startDate: task.startDate ? utcToDateInputValue(task.startDate) : "",
      dueDate: task.dueDate ? utcToDateInputValue(task.dueDate) : "",
      points: task.points?.toString() || "",
      selectedTagIds: task.taskTags?.map((tt) => tt.tag.id) || [],
      selectedAssignees: assignees,
      selectedBoard: board,
      selectedSprints: taskSprints,
      selectedSubtaskIds: task.subtasks?.map((s) => s.id) || [],
      pendingFiles: [],
    });
    setPendingAttachmentDeletions([]);
  };

  // Initialize form data when task changes
  useEffect(() => {
    if (isOpen && task) {
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, task, boards, sprints, users]);

  const handleFormChange = (changes: Partial<TaskFormData>) => {
    setFormData((prev) => ({ ...prev, ...changes }));
  };

  const handleSubmit = async () => {
    if (!task) return;
    const authorUserId = authData?.userDetails?.userId;

    // First update the task
    const updatedTask = await updateTask({
      id: task.id,
      title: formData.title,
      description: formData.description,
      status: formData.status,
      priority: formData.priority,
      startDate: formData.startDate
        ? localDateToUTC(formData.startDate)
        : undefined,
      dueDate: formData.dueDate ? localDateToUTC(formData.dueDate) : undefined,
      points: formData.points ? Number(formData.points) : undefined,
      assigneeIds: formData.selectedAssignees
        .map((a) => a.userId)
        .filter((id): id is number => id !== undefined),
      tagIds: formData.selectedTagIds,
      subtaskIds: formData.selectedSubtaskIds,
      boardId: formData.selectedBoard?.id || undefined,
      sprintIds: formData.selectedSprints.map((s) => s.id),
      userId: authorUserId,
    }).unwrap();

    // Upload any pending files
    if (
      formData.pendingFiles &&
      formData.pendingFiles.length > 0 &&
      authorUserId
    ) {
      setIsUploading(true);
      for (const pf of formData.pendingFiles) {
        let attachmentId: number | null = null;
        try {
          const attachment = await createAttachment({
            taskId: task.id,
            uploadedById: authorUserId,
            fileName: pf.fileName,
            fileExt: pf.fileExt,
          }).unwrap();

          attachmentId = attachment.id;
          const s3Key = `tasks/${task.id}/attachments/${attachment.id}.${pf.fileExt}`;

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

    // Delete attachments that were marked for removal
    for (const attId of pendingAttachmentDeletions) {
      try {
        await deleteAttachment(attId);
      } catch {
        /* ignore */
      }
    }

    onSave?.(updatedTask);
    onClose();
  };

  const isFormValid = () => {
    return formData.title && formData.selectedBoard;
  };

  if (!task) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} name={`Edit: ${task.title}`}>
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
          boards={boards}
          sprints={sprints}
          tags={availableTags}
          showPoints={true}
          filterActiveOnly={false}
          showSubtasks={true}
          showAttachments={true}
          availableTasks={availableTasks}
          currentTaskId={task.id}
          renderBeforeSubtasks={
            task.attachments && task.attachments.length > 0 ? (
              <div className="border-t border-gray-200 pt-4 dark:border-stroke-dark">
                <div className="mb-3 flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-gray-500 dark:text-neutral-500" />
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Existing Attachments
                  </span>
                  <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600 dark:bg-dark-tertiary dark:text-gray-400">
                    {
                      task.attachments.filter(
                        (a) => !pendingAttachmentDeletions.includes(a.id),
                      ).length
                    }
                  </span>
                </div>
                <div className="space-y-2">
                  {task.attachments.map((att) => {
                    const isPendingDelete = pendingAttachmentDeletions.includes(
                      att.id,
                    );
                    return (
                      <div
                        key={att.id}
                        className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                          isPendingDelete
                            ? "border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-900/10"
                            : "border-gray-200 bg-gray-50 dark:border-stroke-dark dark:bg-dark-tertiary"
                        }`}
                      >
                        <span
                          className={`truncate text-sm ${isPendingDelete ? "text-gray-400 line-through dark:text-neutral-500" : "text-gray-700 dark:text-neutral-300"}`}
                        >
                          {att.fileName}
                        </span>
                        {isPendingDelete ? (
                          <button
                            type="button"
                            onClick={() =>
                              setPendingAttachmentDeletions((prev) =>
                                prev.filter((id) => id !== att.id),
                              )
                            }
                            className="ml-2 rounded px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-200 dark:hover:bg-dark-tertiary"
                            title="Undo removal"
                          >
                            Undo
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setPendingAttachmentDeletions((prev) => [
                                ...prev,
                                att.id,
                              ])
                            }
                            className="ml-2 rounded p-1 text-gray-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                            title="Remove attachment"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : undefined
          }
        />

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white dark:hover:bg-dark-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={resetForm}
            className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white dark:hover:bg-dark-secondary"
          >
            Reset
          </button>
          <button
            type="submit"
            className={`flex-1 rounded-md border border-transparent bg-gray-800 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-offset-2 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-200 ${
              !isFormValid() || isLoading || isUploading
                ? "cursor-not-allowed opacity-50"
                : ""
            }`}
            disabled={!isFormValid() || isLoading || isUploading}
          >
            {isLoading || isUploading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default TaskDetailsEditModal;
