"use client";

import { useState, useTransition } from "react";
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
  const [selectedRoleId, setSelectedRoleId] = useState(currentRoleId);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const currentRole = roles.find((r) => r.id === selectedRoleId);

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

  function handleChange(newRoleId: string) {
    setSelectedRoleId(newRoleId);
    setError(null);

    const formData = new FormData();
    formData.set("memberId", memberId);
    formData.set("roleId", newRoleId);
    formData.set("workspaceId", workspaceId);

    startTransition(async () => {
      const result = await assignRole(null, formData);
      if (result?.error) {
        setError(result.error);
        // Revert on failure
        setSelectedRoleId(currentRoleId);
      }
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <select
        name="roleId"
        value={selectedRoleId}
        onChange={(e) => handleChange(e.target.value)}
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
      {error && (
        <span className="text-[10px] text-accent-emphasis">{error}</span>
      )}
    </div>
  );
}
