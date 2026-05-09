import type { TaskStatus, TaskPriority } from "@/prisma/generated/prisma/enums";

export interface TaskCardData {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  dueDate?: Date | null;
  points?: number | null;
  assignees: { id: string; name: string | null; image?: string | null }[];
  tags?: { name: string; color: string | null }[];
  board?: { id: string; name: string; workspaceId?: string };
  boardId?: string;
  workspaceId?: string;
  commentCount?: number;
  subtaskIds?: string[];
  subtaskTotal?: number;
  subtaskCompleted?: number;
}

export interface TaskFormData {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  points: number | null;
  assigneeIds: string[];
  tagIds: string[];
  boardId: string;
  sprintIds: string[];
}
