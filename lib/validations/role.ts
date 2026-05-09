import { z } from "zod";

const RESERVED_ROLE_NAMES = ["Owner", "Member"];

export const createRoleSchema = z.object({
  workspaceId: z.string().min(1),
  name: z
    .string()
    .trim()
    .min(1, "Role name is required")
    .refine((v) => !RESERVED_ROLE_NAMES.includes(v), {
      message: "That role name is reserved",
    }),
  color: z.string().optional().default("#6B7280"),
  permissions: z
    .string()
    .optional()
    .default("0")
    .refine((v) => v === "" || (!isNaN(Number(v)) && parseInt(v) >= 0), {
      message: "Permissions must be a non-negative integer",
    }),
});

export const updateRoleSchema = z.object({
  roleId: z.string().min(1),
  workspaceId: z.string().min(1),
  name: z.string().trim().min(1, "Role name is required"),
  color: z.string().optional().default("#6B7280"),
  permissions: z
    .string()
    .optional()
    .default("0")
    .refine((v) => v === "" || (!isNaN(Number(v)) && parseInt(v) >= 0), {
      message: "Permissions must be a non-negative integer",
    }),
});

export const deleteRoleSchema = z.object({
  roleId: z.string().min(1),
  workspaceId: z.string().min(1),
});

export const assignRoleSchema = z.object({
  memberId: z.string().min(1),
  roleId: z.string().min(1),
  workspaceId: z.string().min(1),
});
