import { useGetWorkspaceMembersQuery } from "@/state/api";
import { useWorkspace } from "./useWorkspace";
import { useAuthUser } from "./useAuthUser";
import { PERMISSIONS, hasPermission } from "./permissions";

export function usePermissions() {
  const { activeWorkspaceId } = useWorkspace();
  const { data: authData } = useAuthUser();
  const userId = authData?.userDetails?.userId;

  const { data: members } = useGetWorkspaceMembersQuery(activeWorkspaceId!, {
    skip: !activeWorkspaceId,
  });

  const currentMember = members?.find((m) => m.userId === userId);
  const permissions = currentMember?.role?.permissions ?? 0;

  return {
    canDelete: hasPermission(permissions, PERMISSIONS.DELETE),
    canEditInfo: hasPermission(permissions, PERMISSIONS.EDIT_INFO),
    canInvite: hasPermission(permissions, PERMISSIONS.INVITE),
    canEditMemberRoles: hasPermission(permissions, PERMISSIONS.EDIT_MEMBER_ROLES),
    canManageApplications: hasPermission(permissions, PERMISSIONS.MANAGE_APPLICATIONS),
    permissions,
  };
}
