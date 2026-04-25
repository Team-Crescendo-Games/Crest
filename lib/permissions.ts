/**
 * Bitfield permissions for workspace roles.
 *
 * Each permission is a single bit. A role's `permissions` integer
 * is the bitwise OR of all granted permissions.
 */

export const Permission = {
  CREATE_CONTENT: 1 << 0,       // Create boards, sprints, tasks
  EDIT_CONTENT: 1 << 1,         // Edit/update boards, sprints, tasks
  DELETE_CONTENT: 1 << 2,       // Delete boards, sprints, tasks
  INVITE_MEMBERS: 1 << 3,       // Create workspace invitations
  MANAGE_ROLES: 1 << 4,         // Edit member roles, create/edit roles
  MANAGE_APPLICATIONS: 1 << 5,  // Approve/reject join applications
  MANAGE_WORKSPACE: 1 << 6,     // Edit workspace settings
} as const;

export type PermissionKey = keyof typeof Permission;

/** All permissions combined (for Owner role). */
export const ALL_PERMISSIONS = Object.values(Permission).reduce(
  (acc, val) => acc | val,
  0
);

/** Default member permissions: create + edit content. */
export const DEFAULT_MEMBER_PERMISSIONS =
  Permission.CREATE_CONTENT | Permission.EDIT_CONTENT;

/** Check if a permissions integer has a specific permission. */
export function hasPermission(permissions: number, perm: number): boolean {
  return (permissions & perm) === perm;
}

/** Human-readable labels for each permission. */
export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  CREATE_CONTENT: "Create content",
  EDIT_CONTENT: "Edit content",
  DELETE_CONTENT: "Delete content",
  INVITE_MEMBERS: "Invite members",
  MANAGE_ROLES: "Manage roles",
  MANAGE_APPLICATIONS: "Manage applications",
  MANAGE_WORKSPACE: "Manage workspace settings",
};
