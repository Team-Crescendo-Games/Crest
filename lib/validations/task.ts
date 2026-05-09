import { z } from "zod";
import { TaskStatus, TaskPriority } from "@/prisma/generated/prisma/enums";

const pointsField = z
  .string()
  .optional()
  .default("")
  .refine((v) => v === "" || (!isNaN(Number(v)) && parseInt(v) >= 0), {
    message: "Points must be a non-negative integer",
  });

export const createTaskSchema = z.object({
  boardId: z.string().min(1),
  workspaceId: z.string().min(1),
  title: z.string().trim().min(1, "Task title is required"),
  description: z.string().optional().default(""),
  status: z.nativeEnum(TaskStatus).default(TaskStatus.NOT_STARTED),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.NONE),
  startDate: z.string().optional().default(""),
  dueDate: z.string().optional().default(""),
  points: pointsField,
  assigneeIds: z.array(z.string()).default([]),
  tagIds: z.array(z.string()).default([]),
  sprintId: z.string().optional().default(""),
});

export const updateTaskSchema = z.object({
  taskId: z.string().min(1),
  title: z.string().trim().min(1, "Task title is required"),
  description: z.string().optional().default(""),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  startDate: z.string().optional().default(""),
  dueDate: z.string().optional().default(""),
  points: pointsField,
  assigneeIds: z.array(z.string()).default([]),
  tagIds: z.array(z.string()).default([]),
  boardId: z.string().optional().default(""),
  sprintIds: z.array(z.string()).default([]),
});

export const updateTaskStatusSchema = z.object({
  taskId: z.string().min(1),
  workspaceId: z.string().min(1),
  status: z.nativeEnum(TaskStatus),
});

export const updateTaskPrioritySchema = z.object({
  taskId: z.string().min(1),
  workspaceId: z.string().min(1),
  priority: z.nativeEnum(TaskPriority),
});

export const moveTaskToBoardSchema = z.object({
  taskId: z.string().min(1),
  boardId: z.string().min(1),
  workspaceId: z.string().min(1),
});

export const updateTaskDueDateSchema = z.object({
  taskId: z.string().min(1),
  dueDate: z.string().optional().default(""),
});

export const updateTaskAssigneesSchema = z.object({
  taskId: z.string().min(1),
  assigneeIds: z.array(z.string()).default([]),
});

export const updateTaskTagsSchema = z.object({
  taskId: z.string().min(1),
  tagIds: z.array(z.string()).default([]),
});

export const updateTaskSprintsSchema = z.object({
  taskId: z.string().min(1),
  sprintIds: z.array(z.string()).default([]),
  workspaceId: z.string().min(1),
});

export const addCommentSchema = z.object({
  taskId: z.string().min(1),
  text: z.string().trim().min(1, "Comment text is required"),
});

export const deleteCommentSchema = z.object({
  commentId: z.string().min(1),
});

export const addSubtaskSchema = z.object({
  parentTaskId: z.string().min(1),
  subtaskId: z.string().min(1),
});

export const removeSubtaskSchema = z.object({
  parentTaskId: z.string().min(1),
  subtaskId: z.string().min(1),
});

export const setTaskParentSchema = z.object({
  childId: z.string().min(1),
  parentId: z.string().optional(),
  workspaceId: z.string().min(1),
});
