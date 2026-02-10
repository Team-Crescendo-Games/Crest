"use client";

import UserIcon from "@/components/UserIcon";

type AssigneeAvatarGroupProps = {
  assignees: Array<{
    userId: number;
    username: string;
    profilePictureExt?: string;
  }>;
  maxDisplay?: number;
  size?: number;
};

const AssigneeAvatarGroup = ({
  assignees,
  maxDisplay = 5,
  size = 32,
}: AssigneeAvatarGroupProps) => {
  // Handle empty assignees with placeholder text
  if (!assignees || assignees.length === 0) {
    return (
      <span className="text-sm text-gray-500 dark:text-gray-400">
        No assignees
      </span>
    );
  }

  // Determine how many avatars to display and if we need overflow indicator
  const displayedAssignees = assignees.slice(0, maxDisplay);
  const overflowCount = assignees.length - maxDisplay;

  return (
    <div className="flex items-center">
      {displayedAssignees.map((assignee, index) => (
        <div
          key={assignee.userId}
          className={index > 0 ? "-ml-2" : ""}
          style={{ zIndex: displayedAssignees.length - index }}
        >
          <UserIcon
            userId={assignee.userId}
            username={assignee.username}
            profilePictureExt={assignee.profilePictureExt}
            size={size}
            tooltipLabel="Assignee"
          />
        </div>
      ))}
      {overflowCount > 0 && (
        <div
          className="dark:bg-dark-tertiary -ml-2 flex items-center justify-center rounded-full bg-gray-300 text-xs font-medium text-gray-700 dark:text-gray-200"
          style={{ width: size, height: size, zIndex: 0 }}
        >
          +{overflowCount}
        </div>
      )}
    </div>
  );
};

export default AssigneeAvatarGroup;
