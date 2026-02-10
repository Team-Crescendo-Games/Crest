import { Priority } from "@/state/api";

/**
 * Global priority color scheme
 * Used consistently across all components that display priority
 */
export const PRIORITY_COLORS: Record<Priority, string> = {
  [Priority.Urgent]: "#E11D48",
  [Priority.High]: "#EDA047",
  [Priority.Medium]: "#5987EB",
  [Priority.Low]: "#CBD5E1",
  [Priority.Backlog]: "#64748B",
};

/**
 * Priority colors by string key (for components that don't use Priority enum)
 */
export const PRIORITY_COLORS_BY_NAME: Record<string, string> = {
  Urgent: "#E11D48",
  High: "#EDA047",
  Medium: "#5987EB",
  Normal: "#5987EB", // Alias for Medium
  Low: "#CBD5E1",
  Backlog: "#64748B",
};

/**
 * Tailwind background classes for priority (for timeline/table views)
 */
export const PRIORITY_BG_CLASSES: Record<string, string> = {
  Urgent: "bg-[#E11D48]",
  High: "bg-[#EDA047]",
  Medium: "bg-[#5987EB]",
  Normal: "bg-[#5987EB]",
  Low: "bg-[#CBD5E1]",
  Backlog: "bg-[#64748B]",
};

/**
 * Priority colors with light/dark mode variants for badges
 */
export const PRIORITY_BADGE_STYLES: Record<
  string,
  { bg: string; text: string; darkBg: string; darkText: string }
> = {
  Urgent: {
    bg: "bg-[#E11D48]",
    text: "text-white",
    darkBg: "dark:bg-[#E11D48]/30",
    darkText: "dark:text-[#fda4af]",
  },
  High: {
    bg: "bg-[#EDA047]",
    text: "text-white",
    darkBg: "dark:bg-[#EDA047]/30",
    darkText: "dark:text-[#fcd34d]",
  },
  Medium: {
    bg: "bg-[#5987EB]",
    text: "text-white",
    darkBg: "dark:bg-[#5987EB]/30",
    darkText: "dark:text-[#93c5fd]",
  },
  Normal: {
    bg: "bg-[#5987EB]",
    text: "text-white",
    darkBg: "dark:bg-[#5987EB]/30",
    darkText: "dark:text-[#93c5fd]",
  },
  Low: {
    bg: "bg-[#CBD5E1]",
    text: "text-white",
    darkBg: "dark:bg-[#CBD5E1]/30",
    darkText: "dark:text-[#e2e8f0]",
  },
  Backlog: {
    bg: "bg-[#64748B]",
    text: "text-white",
    darkBg: "dark:bg-[#64748B]/30",
    darkText: "dark:text-[#cbd5e1]",
  },
};
