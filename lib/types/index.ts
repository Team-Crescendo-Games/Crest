/**
 * Barrel re-exports for shared type definitions.
 *
 * Import from `@/lib/types` instead of individual files.
 *
 * @see Requirements 7.4
 */

// ─── Domain types ───────────────────────────────────────────────────────────
export * from "./action";
export * from "./task";
export * from "./workspace";

// ─── Prisma enum re-exports ─────────────────────────────────────────────────
// Re-exported so consumers can import from `@/lib/types` instead of the
// Prisma generated output path (`@/prisma/generated/prisma/enums`).
export {
  TaskStatus,
  TaskPriority,
  JoinPolicy,
  ApplicationStatus,
  ActivityType,
  NotificationType,
} from "@/prisma/generated/prisma/enums";
