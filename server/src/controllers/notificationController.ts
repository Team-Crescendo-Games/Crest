import type { Request, Response } from "express";
import { getPrismaClient } from "../lib/prisma.ts";
import { checkAndCreateDueDateNotifications } from "../services/notificationService.ts";

// Common include object for notification queries
const notificationInclude = {
    task: {
        select: {
            id: true,
            title: true,
        },
    },
    comment: {
        select: {
            id: true,
            text: true,
        },
    },
    activity: {
        select: {
            id: true,
            activityType: true,
            editField: true,
        },
    },
};

/**
 * GET /notifications - Get all notifications for current user
 */
export const getNotifications = async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.query;

    if (!userId) {
        res.status(400).json({ error: "Invalid user ID" });
        return;
    }

    const userIdNum = Number(userId);
    if (isNaN(userIdNum)) {
        res.status(400).json({ error: "Invalid user ID" });
        return;
    }

    try {
        const notifications = await getPrismaClient().notification.findMany({
            where: {
                userId: userIdNum,
            },
            include: notificationInclude,
            orderBy: {
                createdAt: "desc",
            },
        });

        res.json(notifications);
    } catch (error: any) {
        console.error("Error fetching notifications:", error.message);
        res.status(500).json({ error: `Database error: ${error.message}` });
    }
};

/**
 * GET /notifications/unread-count - Get unread notification count
 */
export const getUnreadCount = async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.query;

    if (!userId) {
        res.status(400).json({ error: "Invalid user ID" });
        return;
    }

    const userIdNum = Number(userId);
    if (isNaN(userIdNum)) {
        res.status(400).json({ error: "Invalid user ID" });
        return;
    }

    try {
        const count = await getPrismaClient().notification.count({
            where: {
                userId: userIdNum,
                isRead: false,
            },
        });

        res.json({ count });
    } catch (error: any) {
        console.error("Error fetching unread count:", error.message);
        res.status(500).json({ error: `Database error: ${error.message}` });
    }
};

/**
 * PATCH /notifications/:id/read - Mark single notification as read
 */
export const markAsRead = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { userId } = req.query;

    const notificationId = Number(id);
    if (isNaN(notificationId)) {
        res.status(400).json({ error: "Invalid notification ID" });
        return;
    }

    if (!userId) {
        res.status(400).json({ error: "Invalid user ID" });
        return;
    }

    const userIdNum = Number(userId);
    if (isNaN(userIdNum)) {
        res.status(400).json({ error: "Invalid user ID" });
        return;
    }

    try {
        const notification = await getPrismaClient().notification.findUnique({
            where: { id: notificationId },
        });

        if (!notification) {
            res.status(404).json({ error: "Notification not found" });
            return;
        }

        if (notification.userId !== userIdNum) {
            res.status(403).json({ error: "Access denied" });
            return;
        }

        const updatedNotification = await getPrismaClient().notification.update({
            where: { id: notificationId },
            data: { isRead: true },
            include: notificationInclude,
        });

        res.json(updatedNotification);
    } catch (error: any) {
        console.error("Error marking notification as read:", error.message);
        res.status(500).json({ error: `Database error: ${error.message}` });
    }
};

/**
 * PATCH /notifications/mark-all-read - Mark all notifications as read for a user
 */
export const markAllAsRead = async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.query;

    if (!userId) {
        res.status(400).json({ error: "Invalid user ID" });
        return;
    }

    const userIdNum = Number(userId);
    if (isNaN(userIdNum)) {
        res.status(400).json({ error: "Invalid user ID" });
        return;
    }

    try {
        const result = await getPrismaClient().notification.updateMany({
            where: {
                userId: userIdNum,
                isRead: false,
            },
            data: { isRead: true },
        });

        res.json({
            message: "All notifications marked as read",
            count: result.count,
        });
    } catch (error: any) {
        console.error("Error marking all notifications as read:", error.message);
        res.status(500).json({ error: `Database error: ${error.message}` });
    }
};

/**
 * DELETE /notifications/:id - Delete single notification
 */
export const deleteNotification = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { userId } = req.query;

    const notificationId = Number(id);
    if (isNaN(notificationId)) {
        res.status(400).json({ error: "Invalid notification ID" });
        return;
    }

    if (!userId) {
        res.status(400).json({ error: "Invalid user ID" });
        return;
    }

    const userIdNum = Number(userId);
    if (isNaN(userIdNum)) {
        res.status(400).json({ error: "Invalid user ID" });
        return;
    }

    try {
        const notification = await getPrismaClient().notification.findUnique({
            where: { id: notificationId },
        });

        if (!notification) {
            res.status(404).json({ error: "Notification not found" });
            return;
        }

        if (notification.userId !== userIdNum) {
            res.status(403).json({ error: "Access denied" });
            return;
        }

        await getPrismaClient().notification.delete({
            where: { id: notificationId },
        });

        res.json({ message: "Notification deleted successfully" });
    } catch (error: any) {
        console.error("Error deleting notification:", error.message);
        res.status(500).json({ error: `Database error: ${error.message}` });
    }
};

/**
 * DELETE /notifications/batch - Delete multiple notifications
 */
export const batchDeleteNotifications = async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.query;
    const { ids } = req.body;

    if (!userId) {
        res.status(400).json({ error: "Invalid user ID" });
        return;
    }

    const userIdNum = Number(userId);
    if (isNaN(userIdNum)) {
        res.status(400).json({ error: "Invalid user ID" });
        return;
    }

    if (!ids || !Array.isArray(ids)) {
        res.status(400).json({ error: "Invalid notification IDs" });
        return;
    }

    if (ids.length === 0) {
        res.json({
            message: "No notifications to delete",
            count: 0,
        });
        return;
    }

    const notificationIds: number[] = [];
    for (const id of ids) {
        const numId = Number(id);
        if (isNaN(numId)) {
            res.status(400).json({ error: "Invalid notification IDs" });
            return;
        }
        notificationIds.push(numId);
    }

    try {
        const notifications = await getPrismaClient().notification.findMany({
            where: {
                id: { in: notificationIds },
            },
            select: {
                id: true,
                userId: true,
            },
        });

        if (notifications.length !== notificationIds.length) {
            res.status(400).json({ error: "Invalid notification IDs" });
            return;
        }

        const unauthorizedNotifications = notifications.filter((n) => n.userId !== userIdNum);
        if (unauthorizedNotifications.length > 0) {
            res.status(403).json({ error: "Access denied" });
            return;
        }

        const result = await getPrismaClient().notification.deleteMany({
            where: {
                id: { in: notificationIds },
                userId: userIdNum,
            },
        });

        res.json({
            message: "Notifications deleted successfully",
            count: result.count,
        });
    } catch (error: any) {
        console.error("Error batch deleting notifications:", error.message);
        res.status(500).json({ error: `Database error: ${error.message}` });
    }
};

/**
 * POST /notifications/check-due-dates - Trigger due date notification check
 */
export const checkDueDates = async (_req: Request, res: Response): Promise<void> => {
    try {
        await checkAndCreateDueDateNotifications();

        res.json({
            message: "Due date check completed successfully",
        });
    } catch (error: any) {
        console.error("Error checking due dates:", error.message);
        res.status(500).json({ error: `Database error: ${error.message}` });
    }
};
