/**
 * Parse a date string as a local date (not UTC).
 * Accepts "yyyy-MM-dd" or full ISO strings like "2025-02-10T00:00:00.000Z".
 * This prevents the off-by-one-day issue when using `new Date("yyyy-MM-dd")`.
 */
export const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.substring(0, 10).split("-").map(Number);
  return new Date(year!, month! - 1, day);
};

/**
 * Format a UTC date-only value (e.g. sprint start/due, task due date) for display.
 * These are stored as UTC midnight in the database, so we must format in UTC
 * to recover the original calendar date regardless of the user's timezone.
 */
export const formatUTCDate = (
  dateString: string,
  options?: Intl.DateTimeFormatOptions,
): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
    ...options,
  });
};

/**
 * Convert a "yyyy-MM-dd" value from an <input type="date"> to a UTC ISO string.
 * Ensures the server always receives an unambiguous UTC timestamp.
 * "2026-02-14" → "2026-02-14T00:00:00.000Z"
 */
export const localDateToUTC = (dateStr: string): string => {
  return `${dateStr}T00:00:00.000Z`;
};

/**
 * Convert a local Date object (e.g. from parseLocalDate or drag operations)
 * to a UTC ISO string preserving the calendar date.
 * new Date(2026, 1, 14) → "2026-02-14T00:00:00.000Z"
 */
export const localDateObjToUTC = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}T00:00:00.000Z`;
};

/**
 * Extract "yyyy-MM-dd" from a UTC ISO date string for use in <input type="date">.
 * "2026-02-14T00:00:00.000Z" → "2026-02-14"
 */
export const utcToDateInputValue = (isoString: string): string => {
  return isoString.substring(0, 10);
};
