"use client";

import { SubtaskSummary, ParentTaskSummary } from "@/state/api";
import { CornerLeftUp, ListTree, User } from "lucide-react";
import S3Image from "@/components/S3Image";
import { STATUS_BADGE_STYLES } from "@/lib/statusColors";

interface SubtaskHierarchyProps {
  parentTask?: ParentTaskSummary | null;
  subtasks?: SubtaskSummary[];
  onTaskClick: (taskId: number) => void;
}

const SubtaskHierarchy = ({
  parentTask,
  subtasks,
  onTaskClick,
}: SubtaskHierarchyProps) => {
  const hasParent = !!parentTask;
  const hasSubtasks = !!subtasks && subtasks.length > 0;

  if (!hasParent && !hasSubtasks) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Parent Task Section */}
      {hasParent && (
        <div className="flex items-center gap-2">
          <CornerLeftUp className="h-4 w-4 text-gray-500 dark:text-neutral-500" />
          <span className="text-sm text-gray-700 dark:text-gray-300">Belongs to:</span>
          <button
            type="button"
            onClick={() => onTaskClick(parentTask!.id)}
            className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
          >
            {parentTask!.title}
          </button>
        </div>
      )}

      {/* Subtasks Section */}
      {hasSubtasks && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <ListTree className="h-4 w-4 text-gray-500 dark:text-neutral-500" />
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Subtasks ({subtasks!.length})
            </h3>
          </div>
          <ul className="space-y-0">
            {subtasks!.map((subtask) => (
              <li key={subtask.id}>
                <button
                  type="button"
                  onClick={() => onTaskClick(subtask.id)}
                  className="flex w-full items-center gap-2 rounded px-2 py-1 text-left hover:bg-gray-100 dark:hover:bg-dark-tertiary"
                >
                  {/* Subtask Title */}
                  <span className="min-w-0 flex-1 truncate text-sm text-blue-600 hover:underline dark:text-blue-400">
                    {subtask.title}
                  </span>

                  {/* Status Badge */}
                  {(() => {
                    const colors = STATUS_BADGE_STYLES[subtask.status || ""] || STATUS_BADGE_STYLES["Input Queue"];
                    return (
                      <span
                        className={`shrink-0 rounded-full px-1.5 py-0.5 text-xs font-semibold ${colors.bg} ${colors.text} ${colors.darkBg} ${colors.darkText}`}
                      >
                        {subtask.status || "Unknown"}
                      </span>
                    );
                  })()}

                  {/* Assignee Avatar */}
                  {subtask.taskAssignments && subtask.taskAssignments.length > 0 && subtask.taskAssignments[0].user.profilePictureExt ? (
                    <S3Image
                      s3Key={`users/${subtask.taskAssignments[0].user.userId}/profile.${subtask.taskAssignments[0].user.profilePictureExt}`}
                      alt={subtask.taskAssignments[0].user.username}
                      width={20}
                      height={20}
                      className="h-5 w-5 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-200 dark:bg-dark-tertiary">
                      <User className="h-3 w-3 text-gray-500 dark:text-neutral-500" />
                    </div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SubtaskHierarchy;
