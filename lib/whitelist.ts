/**
 * Email whitelist for registration.
 *
 * Only emails matching one of these patterns can sign up.
 * Patterns can be:
 *   - Exact emails: "alice@example.com"
 *   - Domain wildcards: "@example.com" (allows anyone @example.com)
 *
 * Configure ALLOWED_EMAILS in your .env as a comma-separated list:
 *   ALLOWED_EMAILS="@mycompany.com,admin@external.com"
 *
 * If ALLOWED_EMAILS is empty or unset, registration is closed to everyone.
 */

import { config } from "@/lib/config";

export function isEmailAllowed(email: string): boolean {
  const patterns = config.auth.allowedEmails;
  if (patterns.length === 0) return false;

  const normalized = email.toLowerCase();

  return patterns.some((pattern) => {
    if (pattern.startsWith("@")) {
      return normalized.endsWith(pattern);
    }
    return normalized === pattern;
  });
}
