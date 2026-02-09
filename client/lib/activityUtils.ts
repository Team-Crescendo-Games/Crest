import { Activity, ActivityType } from "@/state/api";

/**
 * Formats a date into a human-readable relative time string.
 * 
 * Time ranges:
 * - Less than 1 minute: "just now"
 * - 1-59 minutes: "X minutes ago" (or "1 minute ago")
 * - 1-23 hours: "X hours ago" (or "1 hour ago")
 * - 1-6 days: "X days ago" (or "1 day ago")
 * - 7-29 days: "X weeks ago" (or "1 week ago")
 * - 1-11 months: "X months ago" (or "1 month ago")
 * - 1+ years: "X years ago" (or "1 year ago")
 * 
 * @param dateInput - A date string or Date object to format
 * @returns A human-readable relative time string
 * 
 * @example
 * formatRelativeTime(new Date()) // "just now"
 * formatRelativeTime(new Date(Date.now() - 5 * 60 * 1000)) // "5 minutes ago"
 * formatRelativeTime(new Date(Date.now() - 2 * 60 * 60 * 1000)) // "2 hours ago"
 * formatRelativeTime(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)) // "3 days ago"
 */
export function formatRelativeTime(dateInput: string | Date): string {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffSeconds < 60) return "just now";
    if (diffMinutes === 1) return "1 minute ago";
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    if (diffHours === 1) return "1 hour ago";
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return "1 day ago";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffWeeks === 1) return "1 week ago";
    if (diffWeeks < 4) return `${diffWeeks} weeks ago`;
    if (diffMonths === 1) return "1 month ago";
    if (diffMonths < 12) return `${diffMonths} months ago`;
    if (diffYears === 1) return "1 year ago";
    return `${diffYears} years ago`;
}

/**
 * Represents a formatted activity message with structured parts for display.
 */
export interface FormattedActivity {
    /** The username of the user who performed the action */
    username: string;
    /** The action description text */
    action: string;
    /** Optional highlighted parts for status transitions (Move Task activities) */
    highlightedParts?: { text: string; highlight: boolean }[];
}

/**
 * Formats an activity into a structured message for display.
 * 
 * Format patterns:
 * - Create Task: "{username} created the card"
 * - Move Task: "{username} moved the card from {oldStatus} to {newStatus}"
 * - Edit Task: "{username} {editField}"
 * 
 * @param activity - The activity to format
 * @returns A FormattedActivity object with username, action, and optional highlighted parts
 * 
 * @example
 * // Create Task activity
 * formatActivityMessage({ activityType: ActivityType.CREATE_TASK, user: { username: "john" }, ... })
 * // Returns: { username: "john", action: "created the card" }
 * 
 * @example
 * // Move Task activity
 * formatActivityMessage({ activityType: ActivityType.MOVE_TASK, previousStatus: "To Do", newStatus: "In Progress", ... })
 * // Returns: { username: "john", action: "moved the card from", highlightedParts: [...] }
 */
export function formatActivityMessage(activity: Activity): FormattedActivity {
    const username = activity.user?.username || "Unknown user";

    switch (activity.activityType) {
        case ActivityType.CREATE_TASK:
            return {
                username,
                action: "created the card",
            };
        case ActivityType.MOVE_TASK:
            return {
                username,
                action: "moved the card from",
                highlightedParts: [
                    { text: activity.previousStatus || "unknown", highlight: true },
                    { text: " to ", highlight: false },
                    { text: activity.newStatus || "unknown", highlight: true },
                ],
            };
        case ActivityType.EDIT_TASK:
            return {
                username,
                action: activity.editField || "edited the card",
            };
        default:
            return {
                username,
                action: "performed an action",
            };
    }
}
