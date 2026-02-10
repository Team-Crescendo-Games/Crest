"use client";

import { Bell } from "lucide-react";

interface NotificationBadgeProps {
  count: number;
  onClick: () => void;
}

const NotificationBadge = ({ count, onClick }: NotificationBadgeProps) => {
  // Format count to show 99+ for large numbers
  const displayCount = count > 99 ? "99+" : count.toString();

  return (
    <button
      onClick={onClick}
      className="relative flex h-8 w-8 items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700"
      aria-label={`Notifications${count > 0 ? ` (${count} unread)` : ""}`}
    >
      <Bell className="h-5 w-5 cursor-pointer dark:text-white" />

      {/* Badge - only show when count > 0 (Requirement 10.2) */}
      {count > 0 && (
        <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
          {displayCount}
        </span>
      )}
    </button>
  );
};

export default NotificationBadge;
