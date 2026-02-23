"use client";

import type { CollaboratorUser } from "@/lib/useCollaboration";

type Props = {
  collaborators: CollaboratorUser[];
};

const PresenceAvatars = ({ collaborators }: Props) => {
  if (collaborators.length === 0) return null;

  return (
    <div className="flex items-center gap-1">
      {collaborators.slice(0, 5).map((user) => (
        <div
          key={user.cognitoId}
          className="group relative flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white ring-2 ring-white dark:ring-dark-bg"
          style={{ backgroundColor: user.color }}
          title={user.fullName}
        >
          {getInitials(user.fullName)}
          <span className="pointer-events-none absolute -bottom-7 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-0.5 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
            {user.fullName}
          </span>
        </div>
      ))}
      {collaborators.length > 5 && (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-400 text-[10px] font-semibold text-white ring-2 ring-white dark:ring-dark-bg">
          +{collaborators.length - 5}
        </div>
      )}
    </div>
  );
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2)
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default PresenceAvatars;
