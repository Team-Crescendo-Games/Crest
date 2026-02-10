import { Status } from "@/state/api";

/**
 * Global status color scheme
 * Used consistently across all components that display status
 */
export const STATUS_COLORS: Record<Status, string> = {
  [Status.InputQueue]: "#CBD5E1",
  [Status.WorkInProgress]: "#6366F1",
  [Status.Review]: "#06B6D4",
  [Status.Done]: "#334155",
};

/**
 * Status colors by string key (for components that don't use Status enum)
 */
export const STATUS_COLORS_BY_NAME: Record<string, string> = {
  "Input Queue": "#CBD5E1",
  "Work In Progress": "#6366F1",
  Review: "#06B6D4",
  Done: "#334155",
};

/**
 * Tailwind background classes for status
 */
export const STATUS_BG_CLASSES: Record<string, string> = {
  "Input Queue": "bg-[#CBD5E1]",
  "Work In Progress": "bg-[#6366F1]",
  Review: "bg-[#06B6D4]",
  Done: "bg-[#334155]",
};

/**
 * Status colors with light/dark mode variants for badges
 */
export const STATUS_BADGE_STYLES: Record<
  string,
  { bg: string; text: string; darkBg: string; darkText: string }
> = {
  "Input Queue": {
    bg: "bg-[#CBD5E1]",
    text: "text-gray-800",
    darkBg: "dark:bg-[#CBD5E1]/30",
    darkText: "dark:text-[#e2e8f0]",
  },
  "Work In Progress": {
    bg: "bg-[#6366F1]",
    text: "text-white",
    darkBg: "dark:bg-[#6366F1]/30",
    darkText: "dark:text-[#a5b4fc]",
  },
  Review: {
    bg: "bg-[#06B6D4]",
    text: "text-white",
    darkBg: "dark:bg-[#06B6D4]/30",
    darkText: "dark:text-[#67e8f9]",
  },
  Done: {
    bg: "bg-[#334155]",
    text: "text-white",
    darkBg: "dark:bg-[#334155]/30",
    darkText: "dark:text-[#94a3b8]",
  },
};
