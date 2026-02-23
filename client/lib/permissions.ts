export const PERMISSIONS = {
  DELETE: 1 << 0, // 1
  EDIT_INFO: 1 << 1, // 2
  INVITE: 1 << 2, // 4
  EDIT_MEMBER_ROLES: 1 << 3, // 8
  MANAGE_APPLICATIONS: 1 << 4, // 16
} as const;

export const ALL_PERMISSIONS =
  PERMISSIONS.DELETE |
  PERMISSIONS.EDIT_INFO |
  PERMISSIONS.INVITE |
  PERMISSIONS.EDIT_MEMBER_ROLES |
  PERMISSIONS.MANAGE_APPLICATIONS; // 31

export const ADMIN_PERMISSIONS =
  PERMISSIONS.EDIT_INFO |
  PERMISSIONS.INVITE |
  PERMISSIONS.EDIT_MEMBER_ROLES |
  PERMISSIONS.MANAGE_APPLICATIONS; // 30

export type PermissionKey = keyof typeof PERMISSIONS;

export function hasPermission(
  userPermissions: number,
  requiredPermission: number,
): boolean {
  return (userPermissions & requiredPermission) === requiredPermission;
}
