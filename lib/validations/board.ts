import { z } from "zod";

export const createBoardSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().trim().min(1, "Board name is required"),
  description: z.string().optional().default(""),
});

export const updateBoardSchema = z.object({
  boardId: z.string().min(1),
  workspaceId: z.string().min(1),
  name: z.string().trim().min(1, "Board name is required"),
  description: z.string().optional().default(""),
});

export const archiveBoardSchema = z.object({
  boardId: z.string().min(1),
  workspaceId: z.string().min(1),
});

export const deleteBoardSchema = z.object({
  boardId: z.string().min(1),
  workspaceId: z.string().min(1),
});
