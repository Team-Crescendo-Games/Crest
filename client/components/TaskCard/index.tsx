"use client";

import { useState, useRef, useEffect } from "react";
import { Task, Priority, useUpdateTaskMutation, useGetTagsQuery } from "@/state/api";
import RadialProgress from "@/components/RadialProgress";
import { format } from "date-fns";
import { MessageSquareMore, X, Plus } from "lucide-react";
import { Paperclip } from "lucide-react";
import S3Image from "@/components/S3Image";

type Props = {
  task: Task;
  onClick?: () => void;
  className?: string;
};

const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : null;
};

const getAverageTagColor = (task: Task): string | null => {
  const colors = task.taskTags
    ?.map((tt) => tt.tag.color)
    .filter((c): c is string => !!c)
    .map(hexToRgb)
    .filter((c): c is { r: number; g: number; b: number } => c !== null);
  if (!colors || colors.length === 0) return null;
  const avg = {
    r: Math.round(colors.reduce((sum, c) => sum + c.r, 0) / colors.length),
    g: Math.round(colors.reduce((sum, c) => sum + c.g, 0) / colors.length),
    b: Math.round(colors.reduce((sum, c) => sum + c.b, 0) / colors.length),
  };
  return `rgba(${avg.r}, ${avg.g}, ${avg.b}, 0.15)`;
};

const priorityStyles: Record<string, string> = {
  Urgent: "bg-red-200 text-red-700",
  High: "bg-yellow-200 text-yellow-700",
  Medium: "bg-green-200 text-green-700",
  Low: "bg-gray-300 text-gray-700",
  Backlog: "bg-gray-200 text-gray-700",
};

const TaskCard = ({ task, onClick, className = "" }: Props) => {
  const [updateTask] = useUpdateTaskMutation();
  const { data: allTags } = useGetTagsQuery();
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [showTagMenu, setShowTagMenu] = useState(false);
  const priorityRef = useRef<HTMLDivElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);

  const tags = task.taskTags?.map((tt) => tt.tag) || [];
  const tagIds = tags.map((t) => t.id);
  const avgColor = getAverageTagColor(task);
  const formattedDueDate = task.dueDate ? format(new Date(task.dueDate), "P") : "";
  const numberOfComments = task.comments?.length || 0;
  const numberOfAttachments = task.attachments?.length || 0;
  const subtasks = task.subtasks ?? [];
  const totalCount = subtasks.length;
  const completedCount = subtasks.filter((s) => s.status === "Done").length;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (priorityRef.current && !priorityRef.current.contains(e.target as Node)) setShowPriorityMenu(false);
      if (tagRef.current && !tagRef.current.contains(e.target as Node)) setShowTagMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePriorityChange = async (priority: Priority | null) => {
    await updateTask({ id: task.id, priority: priority ?? undefined });
    setShowPriorityMenu(false);
  };

  const handleRemoveTag = async (tagId: number) => {
    await updateTask({ id: task.id, tagIds: tagIds.filter((id) => id !== tagId) });
  };

  const handleAddTag = async (tagId: number) => {
    await updateTask({ id: task.id, tagIds: [...tagIds, tagId] });
    setShowTagMenu(false);
  };

  const availableTags = allTags?.filter((t) => !tagIds.includes(t.id)) || [];

  return (
    <div
      onClick={onClick}
      className={`rounded-md bg-white shadow transition-all hover:outline hover:outline-2 hover:outline-gray-300 dark:bg-dark-secondary dark:hover:outline-gray-600 ${onClick ? "cursor-pointer" : ""} ${className}`}
      style={avgColor ? { backgroundColor: avgColor } : undefined}
    >
      <div className="p-2 md:p-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm dark:text-white">{task.title}</h4>
          {typeof task.points === "number" && (
            <div className="text-xs font-semibold dark:text-white">{task.points} pts</div>
          )}
        </div>

        {/* Tags with inline edit */}
        <div className="mt-1 flex flex-wrap items-center gap-1">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="group flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs"
              style={{ backgroundColor: tag.color ? `${tag.color}30` : "#e5e7eb", color: tag.color || "#374151" }}
            >
              <span>{tag.name}</span>
              <button
                onClick={(e) => { e.stopPropagation(); handleRemoveTag(tag.id); }}
                className="ml-0.5 rounded-full p-0.5 opacity-60 transition-all hover:opacity-100 hover:ring-1 hover:ring-gray-400 dark:hover:ring-gray-500"
              >
                <X size={10} />
              </button>
            </div>
          ))}
          <div ref={tagRef} className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowTagMenu(!showTagMenu); }}
              className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-dark-tertiary dark:text-gray-400 dark:hover:bg-gray-600"
            >
              <Plus size={12} />
            </button>
            {showTagMenu && availableTags.length > 0 && (
              <div className="absolute left-0 top-full z-20 mt-1 max-h-32 overflow-y-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-dark-tertiary dark:bg-dark-secondary">
                {availableTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={(e) => { e.stopPropagation(); handleAddTag(tag.id); }}
                    className="flex w-full items-center gap-2 px-3 py-1 text-left text-xs hover:bg-gray-100 dark:hover:bg-dark-tertiary"
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tag.color || "#3b82f6" }} />
                    {tag.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {formattedDueDate && (
          <div className="mt-1.5 text-xs text-gray-500 dark:text-neutral-500">Due: {formattedDueDate}</div>
        )}
        <div className="mt-2 border-t border-gray-200 dark:border-stroke-dark" />

        <div className="mt-2 flex items-center justify-between">
          <div className="flex -space-x-1 overflow-hidden">
            {task.assignee?.userId && task.assignee?.profilePictureExt && (
              <S3Image
                s3Key={`users/${task.assignee.userId}/profile.${task.assignee.profilePictureExt}`}
                alt={task.assignee.username}
                width={24}
                height={24}
                className="h-6 w-6 rounded-full border-2 border-white object-cover dark:border-dark-secondary"
              />
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Priority with inline edit */}
            <div ref={priorityRef} className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShowPriorityMenu(!showPriorityMenu); }}
                className={`rounded-full px-2 py-0.5 text-xs font-semibold transition-all hover:ring-2 hover:ring-gray-400 dark:hover:ring-gray-500 ${priorityStyles[task.priority || ""] || "bg-gray-100 text-gray-500 dark:bg-dark-tertiary dark:text-gray-400"}`}
              >
                {task.priority || "Priority"}
              </button>
              {showPriorityMenu && (
                <div className="absolute right-0 top-full z-20 mt-1 rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-dark-tertiary dark:bg-dark-secondary">
                  {Object.values(Priority).map((p) => (
                    <button
                      key={p}
                      onClick={(e) => { e.stopPropagation(); handlePriorityChange(p); }}
                      className="block w-full px-3 py-1 text-left text-xs hover:bg-gray-100 dark:hover:bg-dark-tertiary"
                    >
                      <span className={`inline-block rounded-full px-2 py-0.5 ${priorityStyles[p]}`}>{p}</span>
                    </button>
                  ))}
                  {task.priority && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handlePriorityChange(null); }}
                      className="block w-full px-3 py-1 text-left text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-tertiary"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}
            </div>
            {numberOfAttachments > 0 && (
              <div className="flex items-center text-gray-500 dark:text-neutral-500">
                <Paperclip size={16} />
                <span className="ml-1 text-xs dark:text-neutral-400">{numberOfAttachments}</span>
              </div>
            )}
            {numberOfComments > 0 && (
              <div className="flex items-center text-gray-500 dark:text-neutral-500">
                <MessageSquareMore size={16} />
                <span className="ml-1 text-xs dark:text-neutral-400">{numberOfComments}</span>
              </div>
            )}
            {totalCount > 0 && (
              <div className="flex items-center gap-1 text-gray-500 dark:text-neutral-500">
                <RadialProgress completed={completedCount} total={totalCount} />
                <span className="text-xs dark:text-neutral-400">{completedCount}/{totalCount}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
