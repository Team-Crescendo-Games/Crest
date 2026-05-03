import { z } from "zod";
import { JoinPolicy } from "@/prisma/generated/prisma/enums";

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1, "Workspace name is required").max(100, "Name must be 100 characters or fewer"),
  description: z.string().optional().default(""),
});

export const updateWorkspaceSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().trim().min(1, "Workspace name is required").max(100, "Name must be 100 characters or fewer"),
  description: z.string().optional().default(""),
  joinPolicy: z.nativeEnum(JoinPolicy).optional(),
});

export const joinWorkspaceSchema = z.object({
  workspaceId: z.string().min(1),
});

export const applyToWorkspaceSchema = z.object({
  workspaceId: z.string().min(1),
  message: z.string().optional().default(""),
});

export const handleApplicationSchema = z.object({
  applicationId: z.string().min(1),
  action: z.enum(["approve", "reject"]),
});

export const createInvitationSchema = z.object({
  workspaceId: z.string().min(1),
  expiresInDays: z
    .string()
    .optional()
    .default("7")
    .refine((v) => v === "" || (Number.isInteger(Number(v)) && parseInt(v) > 0), {
      message: "expiresInDays must be a positive integer",
    }),
});

export const acceptInvitationSchema = z.object({
  inviteId: z.string().min(1),
});

export const leaveWorkspaceSchema = z.object({
  workspaceId: z.string().min(1),
});

export const transferOwnershipSchema = z.object({
  workspaceId: z.string().min(1),
  newOwnerId: z.string().min(1),
});
