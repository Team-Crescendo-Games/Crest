import { prisma } from "@/lib/prisma";
import {
  Permission,
  PERMISSION_LABELS,
  type PermissionKey,
  hasPermission,
  getEffectivePermissions,
} from "@/lib/permissions";

export interface MembershipResult {
  membership: {
    id: string;
    userId: string;
    workspaceId: string;
    roleId: string;
    role: { id: string; name: string; permissions: number };
  };
  workspace: { createdById: string | null };
}

/**
 * Look up the human-readable label for a permission bitmask value.
 * Falls back to a hex representation if the permission is not recognized.
 */
function getPermissionName(permission: number): string {
  const key = (Object.keys(Permission) as PermissionKey[]).find(
    (k) => Permission[k] === permission,
  );
  return key ? PERMISSION_LABELS[key] : `0x${permission.toString(16)}`;
}

/**
 * Verify that a user is a member of the given workspace.
 * Returns the membership record including the role and workspace creator ID
 * so callers can compute effective permissions without additional queries.
 *
 * @throws {Error} If the user is not a member of the workspace.
 */
export async function requireMembership(
  userId: string,
  workspaceId: string,
): Promise<MembershipResult> {
  const membership = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
    include: { role: true, workspace: { select: { createdById: true } } },
  });
  if (!membership) throw new Error("Not a member of this workspace");
  return {
    membership: {
      id: membership.id,
      userId: membership.userId,
      workspaceId: membership.workspaceId,
      roleId: membership.roleId,
      role: {
        id: membership.role.id,
        name: membership.role.name,
        permissions: membership.role.permissions,
      },
    },
    workspace: { createdById: membership.workspace.createdById },
  };
}

/**
 * Verify that a user is a member of the given workspace AND holds the
 * specified permission. Computes effective permissions (workspace creators
 * automatically receive all permissions).
 *
 * @throws {Error} If the user is not a member or lacks the required permission.
 */
export async function requireMemberWithPermission(
  userId: string,
  workspaceId: string,
  permission: number,
): Promise<MembershipResult> {
  const result = await requireMembership(userId, workspaceId);
  const effectivePerms = getEffectivePermissions(
    result.membership.role.permissions,
    userId,
    result.workspace.createdById,
  );
  if (!hasPermission(effectivePerms, permission)) {
    const permName = getPermissionName(permission);
    throw new Error(`Missing permission: ${permName}`);
  }
  return result;
}
