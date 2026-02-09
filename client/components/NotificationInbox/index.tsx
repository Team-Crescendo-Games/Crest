"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Bell,
  CheckCheck,
  Loader2,
  MessageSquare,
  Clock,
  AlertTriangle,
  Edit,
  UserPlus,
  Trash2,
} from "lucide-react";
import {
  useGetNotificationsQuery,
  useMarkAllNotificationsAsReadMutation,
  useMarkNotificationAsReadMutation,
  useDeleteNotificationMutation,
  useBatchDeleteNotificationsMutation,
  useGetAuthUserQuery,
  NotificationType,
  NotificationSeverity,
  type Notification,
} from "@/state/api";

interface NotificationInboxProps {
  isOpen: boolean;
  onClose: () => void;
  embedded?: boolean; // When true, renders as inline sidebar section instead of dropdown
}

interface NotificationItemProps {
  notification: Notification;
  userId: number;
  isSelected: boolean;
  onSelect: (id: number, selected: boolean) => void;
}

// Helper function to get relative time string
const getRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "just now";
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes === 1 ? "" : "s"} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? "" : "s"} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays === 1 ? "" : "s"} ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} week${diffInWeeks === 1 ? "" : "s"} ago`;
  }

  return date.toLocaleDateString();
};

// Helper function to get notification type label
const getNotificationTypeLabel = (type: NotificationType): string => {
  switch (type) {
    case NotificationType.MENTION:
      return "Mentioned you";
    case NotificationType.NEAR_OVERDUE:
      return "Due soon";
    case NotificationType.OVERDUE:
      return "Overdue";
    case NotificationType.TASK_EDITED:
      return "Task updated";
    case NotificationType.TASK_REASSIGNED:
      return "Assignment changed";
    default:
      return "Notification";
  }
};

// Helper function to get severity color classes
const getSeverityColorClasses = (severity: NotificationSeverity): { icon: string; border: string } => {
  switch (severity) {
    case NotificationSeverity.CRITICAL:
      return {
        icon: "text-red-500",
        border: "border-l-4 border-l-red-500",
      };
    case NotificationSeverity.MEDIUM:
      return {
        icon: "text-orange-500",
        border: "border-l-4 border-l-orange-500",
      };
    case NotificationSeverity.INFO:
    default:
      return {
        icon: "text-gray-500 dark:text-gray-400",
        border: "",
      };
  }
};

// NotificationItem subcomponent
const NotificationItem = ({
  notification,
  userId,
  isSelected,
  onSelect,
}: NotificationItemProps) => {
  const router = useRouter();
  const [markAsRead, { isLoading: isMarkingRead }] = useMarkNotificationAsReadMutation();
  const [deleteNotification, { isLoading: isDeleting }] = useDeleteNotificationMutation();

  const typeLabel = getNotificationTypeLabel(notification.type);
  const severityColors = getSeverityColorClasses(notification.severity);
  const relativeTime = getRelativeTime(notification.createdAt);

  // Render the appropriate icon based on notification type
  const renderIcon = () => {
    const iconProps = { className: "h-5 w-5" };
    switch (notification.type) {
      case NotificationType.MENTION:
        return <MessageSquare {...iconProps} />;
      case NotificationType.NEAR_OVERDUE:
        return <Clock {...iconProps} />;
      case NotificationType.OVERDUE:
        return <AlertTriangle {...iconProps} />;
      case NotificationType.TASK_EDITED:
        return <Edit {...iconProps} />;
      case NotificationType.TASK_REASSIGNED:
        return <UserPlus {...iconProps} />;
      default:
        return <Bell {...iconProps} />;
    }
  };

  // Handle click to mark as read and navigate to task
  const handleClick = async () => {
    // Mark as read if unread
    if (!notification.isRead) {
      try {
        await markAsRead({ notificationId: notification.id, userId });
      } catch (error) {
        console.error("Failed to mark notification as read:", error);
      }
    }

    // Navigate to task if taskId exists
    if (notification.taskId) {
      router.push(`/tasks/${notification.taskId}`);
    }
  };

  // Handle delete
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the click handler
    try {
      await deleteNotification({ notificationId: notification.id, userId });
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  // Handle checkbox change
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onSelect(notification.id, e.target.checked);
  };

  return (
    <div
      className={`group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
        !notification.isRead ? "bg-blue-50/50 dark:bg-blue-900/20" : ""
      } ${severityColors.border}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* Checkbox for batch selection */}
      <div className="flex-shrink-0 pt-1" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={handleCheckboxChange}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-dark-tertiary"
          aria-label={`Select notification for ${notification.task?.title || "task"}`}
        />
      </div>

      {/* Unread indicator */}
      <div className="flex-shrink-0 pt-1.5">
        {!notification.isRead ? (
          <div className="h-2 w-2 rounded-full bg-blue-500" aria-label="Unread" />
        ) : (
          <div className="h-2 w-2" /> // Spacer for alignment
        )}
      </div>

      {/* Icon based on notification type */}
      <div className={`flex-shrink-0 pt-0.5 ${severityColors.icon}`}>
        {renderIcon()}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Task title */}
        <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
          {notification.task?.title || "Notification"}
        </p>

        {/* Notification type label / message */}
        <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-300">
          {notification.message || typeLabel}
        </p>

        {/* Timestamp */}
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {relativeTime}
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Delete button */}
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
          aria-label="Delete notification"
          title="Delete notification"
        >
          {isDeleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Loading indicator for marking as read */}
      {isMarkingRead && (
        <div className="flex-shrink-0">
          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
        </div>
      )}
    </div>
  );
};

// Compact notification item for embedded sidebar view
const EmbeddedNotificationItem = ({
  notification,
  userId,
  isSelected,
  onSelect,
}: NotificationItemProps) => {
  const router = useRouter();
  const [markAsRead] = useMarkNotificationAsReadMutation();
  const severityColors = getSeverityColorClasses(notification.severity);
  const relativeTime = getRelativeTime(notification.createdAt);

  // Render compact icon
  const renderIcon = () => {
    const iconProps = { className: "h-4 w-4" };
    switch (notification.type) {
      case NotificationType.MENTION:
        return <MessageSquare {...iconProps} />;
      case NotificationType.NEAR_OVERDUE:
        return <Clock {...iconProps} />;
      case NotificationType.OVERDUE:
        return <AlertTriangle {...iconProps} />;
      case NotificationType.TASK_EDITED:
        return <Edit {...iconProps} />;
      case NotificationType.TASK_REASSIGNED:
        return <UserPlus {...iconProps} />;
      default:
        return <Bell {...iconProps} />;
    }
  };

  const handleClick = async () => {
    if (!notification.isRead) {
      try {
        await markAsRead({ notificationId: notification.id, userId });
      } catch (error) {
        console.error("Failed to mark notification as read:", error);
      }
    }
    if (notification.taskId) {
      router.push(`/tasks/${notification.taskId}`);
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onSelect(notification.id, e.target.checked);
  };

  return (
    <div
      className={`group flex items-center gap-2 px-6 py-2 cursor-pointer transition-colors hover:bg-gray-100 dark:hover:bg-dark-tertiary ${
        !notification.isRead ? "bg-blue-50/30 dark:bg-blue-900/10" : ""
      } ${severityColors.border}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* Checkbox */}
      <div onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={handleCheckboxChange}
          className="h-3 w-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-dark-tertiary"
        />
      </div>

      {/* Unread dot */}
      {!notification.isRead && (
        <div className="h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0" />
      )}

      {/* Icon */}
      <div className={`flex-shrink-0 ${severityColors.icon}`}>
        {renderIcon()}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-700 dark:text-gray-200 truncate">
          {notification.task?.title || "Notification"}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {relativeTime}
        </p>
      </div>
    </div>
  );
};

const NotificationInbox = ({ isOpen, onClose, embedded = false }: NotificationInboxProps) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Get current user
  const { data: currentUser } = useGetAuthUserQuery({});
  const userId = currentUser?.userDetails?.userId;

  // Fetch notifications for the current user
  const {
    data: notifications,
    isLoading,
    isError,
  } = useGetNotificationsQuery(userId!, {
    skip: !userId || !isOpen,
  });

  // Mark all as read mutation
  const [markAllAsRead, { isLoading: isMarkingAllRead }] =
    useMarkAllNotificationsAsReadMutation();

  // Batch delete mutation
  const [batchDelete, { isLoading: isBatchDeleting }] =
    useBatchDeleteNotificationsMutation();

  // Handle click outside to close dropdown (only for non-embedded mode)
  useEffect(() => {
    if (embedded) return; // Skip for embedded mode
    
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      // Delay adding listener to prevent immediate close
      const timeoutId = setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 0);
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen, onClose, embedded]);

  // Handle escape key to close (only for non-embedded mode)
  useEffect(() => {
    if (embedded) return; // Skip for embedded mode
    
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, onClose, embedded]);

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    if (!userId) return;
    try {
      await markAllAsRead(userId);
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  // Handle selection toggle for batch operations
  const handleSelect = (id: number, selected: boolean) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  // Handle select all toggle
  const handleSelectAll = () => {
    if (!notifications) return;
    
    if (selectedIds.size === notifications.length) {
      // All are selected, deselect all
      setSelectedIds(new Set());
    } else {
      // Select all
      setSelectedIds(new Set(notifications.map((n) => n.id)));
    }
  };

  // Handle batch delete
  const handleBatchDelete = async () => {
    if (!userId || selectedIds.size === 0) return;
    
    try {
      await batchDelete({ ids: Array.from(selectedIds), userId });
      // Clear selection after successful deletion
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Failed to delete selected notifications:", error);
    }
  };

  if (!isOpen) return null;

  // Count unread notifications
  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

  // Compute select all checkbox state
  const notificationCount = notifications?.length ?? 0;
  const selectedCount = selectedIds.size;
  const isAllSelected = notificationCount > 0 && selectedCount === notificationCount;
  const isIndeterminate = selectedCount > 0 && selectedCount < notificationCount;

  // Embedded mode - render as inline sidebar section
  if (embedded) {
    return (
      <div className="overflow-hidden">
        {/* Action bar */}
        {(unreadCount > 0 || selectedCount > 0) && (
          <div className="flex items-center justify-between px-6 py-2 text-xs">
            <div className="flex items-center gap-2">
              {notificationCount > 0 && (
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = isIndeterminate;
                  }}
                  onChange={handleSelectAll}
                  className="h-3 w-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-dark-tertiary"
                  aria-label="Select all"
                />
              )}
              {selectedCount > 0 && (
                <button
                  onClick={handleBatchDelete}
                  disabled={isBatchDeleting}
                  className="flex items-center gap-1 text-red-600 hover:text-red-700 disabled:opacity-50 dark:text-red-400"
                >
                  {isBatchDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                  <span>Delete ({selectedCount})</span>
                </button>
              )}
            </div>
            {unreadCount > 0 && selectedCount === 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={isMarkingAllRead}
                className="flex items-center gap-1 text-blue-600 hover:text-blue-700 disabled:opacity-50 dark:text-blue-400"
              >
                {isMarkingAllRead ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCheck className="h-3 w-3" />}
                <span>Mark all read</span>
              </button>
            )}
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-4 px-6">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Loading...</span>
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="px-6 py-4 text-center text-sm text-red-500">
            Failed to load notifications
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && notifications?.length === 0 && (
          <div className="px-6 py-4 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">No notifications</p>
          </div>
        )}

        {/* Notification items */}
        {!isLoading && !isError && notifications && notifications.length > 0 && userId && (
          <div className="max-h-64 overflow-y-auto">
            {notifications.map((notification) => (
              <EmbeddedNotificationItem
                key={notification.id}
                notification={notification}
                userId={userId}
                isSelected={selectedIds.has(notification.id)}
                onSelect={handleSelect}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Dropdown mode (original)

  return (
    <div
      ref={dropdownRef}
      className="absolute bottom-full left-0 z-50 mb-2 w-96 max-w-[calc(100vw-2rem)] rounded-lg bg-white shadow-lg dark:bg-dark-secondary"
      role="dialog"
      aria-label="Notifications"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-stroke-dark">
        <div className="flex items-center gap-2">
          {/* Select all checkbox - only show when there are notifications */}
          {notificationCount > 0 && (
            <input
              type="checkbox"
              checked={isAllSelected}
              ref={(el) => {
                if (el) {
                  el.indeterminate = isIndeterminate;
                }
              }}
              onChange={handleSelectAll}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-dark-tertiary"
              aria-label="Select all notifications"
              title={isAllSelected ? "Deselect all" : "Select all"}
            />
          )}
          <Bell className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
            Notifications
          </h2>
          {unreadCount > 0 && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-600 dark:bg-blue-900 dark:text-blue-300">
              {unreadCount} new
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Delete selected button - only show when items are selected */}
          {selectedCount > 0 && (
            <button
              onClick={handleBatchDelete}
              disabled={isBatchDeleting}
              className="flex items-center gap-1 rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/30"
              title={`Delete ${selectedCount} selected notification${selectedCount === 1 ? "" : "s"}`}
            >
              {isBatchDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              <span>Delete ({selectedCount})</span>
            </button>
          )}
          {/* Mark all as read button - only show if there are unread notifications */}
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              disabled={isMarkingAllRead}
              className="flex items-center gap-1 rounded px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 disabled:opacity-50 dark:text-blue-400 dark:hover:bg-gray-700"
              title="Mark all as read"
            >
              {isMarkingAllRead ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCheck className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Mark all read</span>
            </button>
          )}
          {/* Close button */}
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Close notifications"
          >
            <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Notification list */}
      <div className="max-h-96 overflow-y-auto">
        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500 dark:text-gray-400">
              Loading notifications...
            </span>
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-2 text-red-500">
              Failed to load notifications
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Please try again later
            </p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && notifications?.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Bell className="mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" />
            <p className="text-gray-500 dark:text-gray-400">
              No notifications yet
            </p>
            <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
              You&apos;ll see notifications here when there&apos;s activity on your tasks
            </p>
          </div>
        )}

        {/* Notification items - using NotificationItem subcomponent */}
        {!isLoading && !isError && notifications && notifications.length > 0 && userId && (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                userId={userId}
                isSelected={selectedIds.has(notification.id)}
                onSelect={handleSelect}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationInbox;
