"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
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
  NotificationType,
  NotificationSeverity,
  type Notification,
} from "@/state/api";
import { useAuthUser } from "@/lib/useAuthUser";

import Header from "@/components/Header";
import RefreshButton from "@/components/RefreshButton";

// Helper function to get relative time string
const getRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
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
const getSeverityColors = (severity: NotificationSeverity) => {
  switch (severity) {
    case NotificationSeverity.CRITICAL:
      return { icon: "text-red-500", border: "border-l-4 border-l-red-500" };
    case NotificationSeverity.MEDIUM:
      return {
        icon: "text-orange-500",
        border: "border-l-4 border-l-orange-500",
      };
    default:
      return { icon: "text-gray-500 dark:text-gray-400", border: "" };
  }
};

interface NotificationRowProps {
  notification: Notification;
  userId: number;
  isSelected: boolean;
  onSelect: (id: number, selected: boolean) => void;
}

const NotificationRow = ({
  notification,
  userId,
  isSelected,
  onSelect,
}: NotificationRowProps) => {
  const router = useRouter();
  const [markAsRead] = useMarkNotificationAsReadMutation();
  const [deleteNotification] = useDeleteNotificationMutation();
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const wasDraggingRef = useRef(false);
  const SWIPE_THRESHOLD = 150;

  const severityColors = getSeverityColors(notification.severity);
  const typeLabel = getNotificationTypeLabel(notification.type);

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

  const handleSingleClick = async () => {
    if (!notification.isRead) {
      try {
        await markAsRead({ notificationId: notification.id, userId });
      } catch (error) {
        console.error("Failed to mark as read:", error);
      }
    }
    if (notification.taskId) {
      router.push(
        `/tasks/${notification.taskId}?returnUrl=${encodeURIComponent("/inbox")}`,
      );
    }
  };

  const handleClick = () => {
    if (wasDraggingRef.current) {
      wasDraggingRef.current = false;
      return;
    }
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      return;
    }
    clickTimeoutRef.current = setTimeout(() => {
      clickTimeoutRef.current = null;
      handleSingleClick();
    }, 200);
  };

  const performDelete = async () => {
    if (rowRef.current) {
      const row = rowRef.current;
      const height = row.offsetHeight;
      row.style.height = `${height}px`;
      row.style.transition = "none";
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      row.offsetHeight;
      row.style.transition = "height 250ms ease-out, opacity 200ms ease-out";
      requestAnimationFrame(() => {
        row.style.height = "0px";
        row.style.opacity = "0";
        row.style.paddingTop = "0px";
        row.style.paddingBottom = "0px";
      });
    }
    setIsRemoving(true);
    setTimeout(async () => {
      try {
        await deleteNotification({ notificationId: notification.id, userId });
      } catch (error) {
        console.error("Failed to delete:", error);
        setIsRemoving(false);
        if (rowRef.current) {
          rowRef.current.style.height = "";
          rowRef.current.style.opacity = "";
          rowRef.current.style.paddingTop = "";
          rowRef.current.style.paddingBottom = "";
        }
      }
    }, 300);
  };

  const handleDoubleClick = async () => {
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    performDelete();
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    performDelete();
  };

  // Drag handlers
  const handleDragStart = (clientX: number) => {
    dragStartX.current = clientX;
    setIsDragging(true);
  };

  const handleDragMove = (clientX: number) => {
    if (!isDragging) return;
    const diff = clientX - dragStartX.current;
    setDragX(Math.max(0, diff));
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragX > 5) {
      wasDraggingRef.current = true;
    }
    if (dragX >= SWIPE_THRESHOLD) {
      setDragX(window.innerWidth);
      setTimeout(() => performDelete(), 150);
    } else {
      setDragX(0);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (
      (e.target as HTMLElement).closest('input[type="checkbox"]') ||
      (e.target as HTMLElement).closest("button")
    )
      return;
    handleDragStart(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleDragMove(e.clientX);
  };

  const handleMouseUp = () => {
    handleDragEnd();
  };

  const handleMouseLeave = () => {
    if (isDragging) handleDragEnd();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (
      (e.target as HTMLElement).closest('input[type="checkbox"]') ||
      (e.target as HTMLElement).closest("button")
    )
      return;
    handleDragStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleDragMove(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    handleDragEnd();
  };

  const swipeProgress = Math.min(dragX / SWIPE_THRESHOLD, 1);

  return (
    <div
      ref={rowRef}
      className={`relative overflow-hidden ${severityColors.border}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Delete background */}
      <div
        className="absolute inset-0 flex items-center bg-red-500 px-6"
        style={{ opacity: swipeProgress }}
      >
        <Trash2 className="h-5 w-5 text-white" />
        <span className="ml-2 text-sm font-medium text-white">Delete</span>
      </div>

      {/* Main content */}
      <div
        className={`group relative flex cursor-pointer items-center gap-4 bg-white px-6 py-2 hover:bg-gray-50 dark:bg-dark-secondary dark:hover:bg-dark-tertiary ${
          !notification.isRead ? "bg-gray-100/50 dark:bg-white/5" : "opacity-60"
        }`}
        style={{
          transform: `translateX(${dragX}px)`,
          transition: isDragging ? "none" : "transform 200ms ease-out",
        }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        {/* Checkbox */}
        <div
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelect(notification.id, e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 bg-white text-accent focus:ring-accent focus:ring-offset-0 dark:border-gray-500 dark:bg-dark-tertiary dark:checked:bg-white dark:checked:text-accent"
          />
        </div>

        {/* Unread indicator */}
        <div className="w-2">
          {!notification.isRead && (
            <div className="h-2 w-2 rounded-full bg-accent dark:bg-white" />
          )}
        </div>

        {/* Icon */}
        <div className={`flex-shrink-0 ${severityColors.icon}`}>
          {renderIcon()}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
            {typeLabel}
          </p>
          <p className="truncate text-sm text-gray-600 dark:text-gray-400">
            {notification.task?.title || notification.message || "Notification"}
          </p>
        </div>

        {/* Timestamp */}
        <div className="flex-shrink-0 text-sm text-gray-500 dark:text-gray-400">
          {getRelativeTime(notification.createdAt)}
        </div>

        {/* Delete button */}
        <button
          onClick={handleDelete}
          disabled={isRemoving}
          className="flex-shrink-0 rounded-full p-2 text-gray-400 opacity-0 transition-opacity hover:bg-red-100 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-900/30 dark:hover:text-red-400"
          title="Delete (or double-click row)"
        >
          {isRemoving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
};

const InboxPage = () => {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const { data: currentUser } = useAuthUser();
  const userId = currentUser?.userDetails?.userId;

  const {
    data: notifications,
    isLoading,
    isError,
    refetch,
  } = useGetNotificationsQuery(userId!, {
    skip: !userId,
  });

  const [markAllAsRead, { isLoading: isMarkingAllRead }] =
    useMarkAllNotificationsAsReadMutation();
  const [batchDelete, { isLoading: isBatchDeleting }] =
    useBatchDeleteNotificationsMutation();

  const handleMarkAllAsRead = async () => {
    if (!userId) return;
    try {
      await markAllAsRead(userId);
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const handleSelect = (id: number, selected: boolean) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (selected) newSet.add(id);
      else newSet.delete(id);
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (!notifications) return;
    if (selectedIds.size === notifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notifications.map((n) => n.id)));
    }
  };

  const handleBatchDelete = async () => {
    if (!userId || selectedIds.size === 0) return;
    try {
      await batchDelete({ ids: Array.from(selectedIds), userId });
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;
  const notificationCount = notifications?.length ?? 0;
  const selectedCount = selectedIds.size;
  const isAllSelected =
    notificationCount > 0 && selectedCount === notificationCount;

  return (
    <div className="flex h-full w-full flex-col p-8">
      {/* Header */}
      <Header
        name={
          <div className="flex items-center gap-3">
            <span>Inbox</span>
            <RefreshButton onRefresh={refetch} label="Inbox" />
            {unreadCount > 0 && (
              <span className="rounded-full bg-gray-200 px-2.5 py-0.5 text-sm font-medium text-gray-700 dark:bg-white/10 dark:text-white">
                {unreadCount} unread
              </span>
            )}
          </div>
        }
        buttonComponent={
          <div className="flex items-center gap-2">
            {selectedCount > 0 && (
              <button
                onClick={handleBatchDelete}
                disabled={isBatchDeleting}
                className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-50 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
              >
                {isBatchDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Delete ({selectedCount})
              </button>
            )}
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={isMarkingAllRead}
                className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50 dark:bg-dark-tertiary dark:text-gray-200 dark:hover:bg-gray-700"
              >
                {isMarkingAllRead ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCheck className="h-4 w-4" />
                )}
                Mark all read
              </button>
            )}
          </div>
        }
      />

      {/* Select all bar */}
      {notificationCount > 0 && (
        <div className="flex items-center gap-4 rounded-t-lg border-b border-gray-200 bg-white px-6 py-2 dark:border-gray-700 dark:bg-dark-secondary">
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={handleSelectAll}
            className="h-4 w-4 rounded border-gray-300 bg-white text-accent focus:ring-accent focus:ring-offset-0 dark:border-gray-500 dark:bg-dark-tertiary dark:checked:bg-white dark:checked:text-accent"
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {selectedCount > 0 ? `${selectedCount} selected` : "Select all"}
          </span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto rounded-b-lg bg-white dark:bg-dark-secondary">
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-3 text-gray-500 dark:text-gray-400">
              Loading notifications...
            </span>
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-red-500">Failed to load notifications</div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Please try again later
            </p>
          </div>
        )}

        {!isLoading && !isError && notifications?.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Bell className="mb-4 h-16 w-16 text-gray-300 dark:text-gray-600" />
            <p className="text-lg text-gray-500 dark:text-gray-400">
              No notifications yet
            </p>
            <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
              You&apos;ll see notifications here when there&apos;s activity on
              your tasks
            </p>
          </div>
        )}

        {!isLoading &&
          !isError &&
          notifications &&
          notifications.length > 0 &&
          userId && (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {notifications.map((notification) => (
                <NotificationRow
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

export default InboxPage;
