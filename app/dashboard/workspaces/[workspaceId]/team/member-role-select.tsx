"use client";

import { useActionState } from "react";
import { assignRole } from "@/lib/actions/role";

interface Role {
  id: string;
  name: string;
  color: string;
}

export function MemberRoleSelect({
  memberId,
  currentRoleId,
  roles,
  workspaceId,
  canManage,
}: {
  memberId: string;
  currentRoleId: string;
  roles: Role[];
  workspaceId: string;
  canManage: boolean;
}) {
  const [state, action, pending] = useActionState(assignRole, null);

  const currentRole = roles.find((r) => r.id === currentRoleId);

  if (!canManage) {
    return (
      <span
        className="rounded-full border px-2 py-0.5 text-[11px] font-medium"
        style={{
          borderColor: (currentRole?.color ?? "#6B7280") + "40",
          color: currentRole?.color ?? "#6B7280",
        }}
      >
        {currentRole?.name ?? "Unknown"}
      </span>
    );
  }

  return (
    <form action={action} className="flex items-center gap-1.5">
      <input type="hidden" name="memberId" value={memberId} />
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <select
        name="roleId"
        defaultValue={currentRoleId}
        onChange={(e) => {
          const form = e.target.closest("form");
          if (form) form.requestSubmit();
        }}
        disabled={pending}
        className="rounded-full border bg-transparent px-2 py-0.5 text-[11px] font-medium transition-colors focus:border-accent focus:outline-none disabled:opacity-50"
        style={{
          borderColor: (currentRole?.color ?? "#6B7280") + "40",
          color: currentRole?.color ?? "#6B7280",
        }}
      >
        {roles.map((role) => (
          <option key={role.id} value={role.id}>
            {role.name}
          </option>
        ))}
      </select>
      {state?.error && (
        <span className="text-[10px] text-accent-emphasis">{state.error}</span>
      )}
    </form>
  );
}
