import { z } from "zod";

const hexColorField = z
  .string()
  .optional()
  .default("#6B7280")
  .refine((v) => v === "" || /^#[0-9a-fA-F]{6}$/.test(v), {
    message: "Color must be a valid hex color (e.g. #a1b2c3)",
  });

export const createTagSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().trim().min(1, "Tag name is required"),
  color: hexColorField,
});

export const updateTagSchema = z.object({
  tagId: z.string().min(1),
  workspaceId: z.string().min(1),
  name: z.string().trim().min(1, "Tag name is required"),
  color: hexColorField,
});

export const deleteTagSchema = z.object({
  tagId: z.string().min(1),
  workspaceId: z.string().min(1),
});

export const setTaskTagsSchema = z.object({
  taskId: z.string().min(1),
  workspaceId: z.string().min(1),
  tagIds: z.array(z.string()).default([]),
});
