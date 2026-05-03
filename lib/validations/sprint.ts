import { z } from "zod";

const dateRefinement = (data: { startDate?: string; endDate?: string }) => {
  if (data.startDate && data.endDate) {
    return new Date(data.endDate) >= new Date(data.startDate);
  }
  return true;
};

const dateRefinementMessage = {
  message: "End date must be on or after start date",
  path: ["endDate"],
};

export const createSprintSchema = z
  .object({
    workspaceId: z.string().min(1),
    title: z.string().trim().min(1, "Sprint title is required"),
    startDate: z.string().optional().default(""),
    endDate: z.string().optional().default(""),
  })
  .refine(dateRefinement, dateRefinementMessage);

export const updateSprintSchema = z
  .object({
    sprintId: z.string().min(1),
    workspaceId: z.string().min(1),
    title: z.string().trim().min(1, "Sprint title is required"),
    startDate: z.string().optional().default(""),
    endDate: z.string().optional().default(""),
  })
  .refine(dateRefinement, dateRefinementMessage);

export const toggleSprintActiveSchema = z.object({
  sprintId: z.string().min(1),
  workspaceId: z.string().min(1),
});

export const deleteSprintSchema = z.object({
  sprintId: z.string().min(1),
  workspaceId: z.string().min(1),
});

export const assignTaskToSprintSchema = z.object({
  sprintId: z.string().min(1),
  taskId: z.string().min(1),
  workspaceId: z.string().min(1),
});

export const removeTaskFromSprintSchema = z.object({
  sprintId: z.string().min(1),
  taskId: z.string().min(1),
  workspaceId: z.string().min(1),
});

export const migrateSprintSchema = z.object({
  sourceSprintId: z.string().min(1),
  workspaceId: z.string().min(1),
  title: z.string().trim().min(1, "Sprint title is required"),
});
