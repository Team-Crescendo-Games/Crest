/**
 * Standardized result type for all mutation server actions.
 *
 * Success branch includes an index signature so callers can attach
 * additional payload fields (e.g. created entity IDs) alongside the
 * `success` flag.
 *
 * @see Requirements 8.1, 8.4
 */
export type ActionResult = { success: true; [key: string]: unknown } | { error: string };
