/**
 * Shared workspace-related type definitions.
 *
 * @see Requirements 7.1
 */

export interface WorkspaceMemberInfo {
  id: string;
  name: string | null;
  email: string | null;
  image?: string | null;
}
