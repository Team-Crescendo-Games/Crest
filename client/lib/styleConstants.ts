/**
 * Global style constants for reusable Tailwind class patterns
 */

/**
 * Base styles for tab buttons used in header components
 * Includes the underline indicator positioning via pseudo-element
 */
export const TAB_BUTTON_BASE_STYLES =
  "relative flex items-center gap-2 px-1 py-1 sm:px-2 lg:px-4";

/**
 * Active tab underline indicator styles - positioned at bottom of button
 */
export const TAB_BUTTON_INDICATOR_STYLES =
  "absolute bottom-0 left-0 h-0.5 w-full z-10";
