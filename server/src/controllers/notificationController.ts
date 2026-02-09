import type { Request, Response } from "express";
import { PrismaClient } from '../../prisma/generated/prisma/client.js';
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { checkAndCreateDueDateNotifications } from "../services/notificationService.ts";

// Lazy initialization of Prisma client (following existing pattern from controllers)
let prisma: PrismaClient;

function getPrismaClient() {
    if (!prisma) {
        const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
        const adapter = new PrismaPg(pool);
        prisma = new PrismaClient({ adapter });
    }
    return prisma;
}

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
 * 
 * Query Parameters:
 * - userId: number (required) - The ID of the user to fetch notifications for
 * 
 * Requirements validated:
 * - 7.1: Returns all notifications for the current user sorted by createdAt descending
 * 
 * @param req - Express request object
 * @param res - Express response object
 */
export const getNotifications = async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.query;

    // Validate userId
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
        // Requirement 7.1: Fetch all notifications sorted by createdAt descending
        const notifications = await getPrismaClient().notification.findMany({
            where: {
                userId: userIdNum,
            },
            include: notificationInclude,
            orderBy: {
                createdAt: 'desc',
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
 * 
 * Query Parameters:
 * - userId: number (required) - The ID of the user to count unread notifications for
 * 
 * Requirements validated:
 * - 10.1: Returns the count of unread notifications for the user
 * 
 * @param req - Express request object
 * @param res - Express response object
 */
export const getUnreadCount = async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.query;

    // Validate userId
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
 * 
 * URL Parameters:
 * - id: number (required) - The ID of the notification to mark as read
 * 
 * Query Parameters:
 * - userId: number (required) - The ID of the user making the request (for authorization)
 * 
 * Requirements validated:
 * - 8.1: Marks the notification as read when clicked
 * 
 * Error Handling:
 * - 404: Notification not found
 * - 403: Unauthorized access (notification belongs to different user)
 * 
 * @param req - Express request object
 * @param res - Express response object
 */
export const markAsRead = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { userId } = req.query;

    // Validate notification ID
    const notificationId = Number(id);
    if (isNaN(notificationId)) {
        res.status(400).json({ error: "Invalid notification ID" });
        return;
    }

    // Validate userId
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
        // First, check if the notification exists
        const notification = await getPrismaClient().notification.findUnique({
            where: { id: notificationId },
        });

        if (!notification) {
            res.status(404).json({ error: "Notification not found" });
            return;
        }

        // Check if the notification belongs to the requesting user
        if (notification.userId !== userIdNum) {
            res.status(403).json({ error: "Access denied" });
            return;
        }

        // Requirement 8.1: Mark the notification as read
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
 * 
 * Query Parameters:
 * - userId: number (required) - The ID of the user whose notifications should be marked as read
 * 
 * Requirements validated:
 * - 8.2: Marks all unread notifications for the user as read
 * 
 * @param req - Express request object
 * @param res - Express response object
 */
export const markAllAsRead = async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.query;

    // Validate userId
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
        // Requirement 8.2: Mark all unread notifications as read for the user
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
 * 
 * URL Parameters:
 * - id: number (required) - The ID of the notification to delete
 * 
 * Query Parameters:
 * - userId: number (required) - The ID of the user making the request (for authorization)
 * 
 * Requirements validated:
 * - 9.1: Permanently removes the notification from the database
 * 
 * Error Handling:
 * - 404: Notification not found
 * - 403: Unauthorized access (notification belongs to different user)
 * 
 * @param req - Express request object
 * @param res - Express response object
 */
export const deleteNotification = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { userId } = req.query;

    // Validate notification ID
    const notificationId = Number(id);
    if (isNaN(notificationId)) {
        res.status(400).json({ error: "Invalid notification ID" });
        return;
    }

    // Validate userId
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
        // First, check if the notification exists
        const notification = await getPrismaClient().notification.findUnique({
            where: { id: notificationId },
        });

        if (!notification) {
            res.status(404).json({ error: "Notification not found" });
            return;
        }

        // Check if the notification belongs to the requesting user
        if (notification.userId !== userIdNum) {
            res.status(403).json({ error: "Access denied" });
            return;
        }

        // Requirement 9.1: Permanently delete the notification
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
 * 
 * Query Parameters:
 * - userId: number (required) - The ID of the user making the request (for authorization)
 * 
 * Request Body:
 * - ids: number[] (required) - Array of notification IDs to delete
 * 
 * Requirements validated:
 * - 9.2: Permanently removes all selected notifications from the database
 * 
 * Error Handling:
 * - 400: Invalid notification IDs (empty array, non-numeric values, or IDs belonging to other users)
 * 
 * @param req - Express request object
 * @param res - Express response object
 */
export const batchDeleteNotifications = async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.query;
    const { ids } = req.body;

    // Validate userId
    if (!userId) {
        res.status(400).json({ error: "Invalid user ID" });
        return;
    }

    const userIdNum = Number(userId);
    if (isNaN(userIdNum)) {
        res.status(400).json({ error: "Invalid user ID" });
        return;
    }

    // Validate ids array
    if (!ids || !Array.isArray(ids)) {
        res.status(400).json({ error: "Invalid notification IDs" });
        return;
    }

    // Handle empty array case
    if (ids.length === 0) {
        res.json({ 
            message: "No notifications to delete",
            count: 0,
        });
        return;
    }

    // Validate all IDs are numbers
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
        // Verify all notifications exist and belong to the user
        const notifications = await getPrismaClient().notification.findMany({
            where: {
                id: { in: notificationIds },
            },
            select: {
                id: true,
                userId: true,
            },
        });

        // Check if all requested IDs were found
        if (notifications.length !== notificationIds.length) {
            res.status(400).json({ error: "Invalid notification IDs" });
            return;
        }

        // Check if all notifications belong to the requesting user
        const unauthorizedNotifications = notifications.filter(n => n.userId !== userIdNum);
        if (unauthorizedNotifications.length > 0) {
            res.status(403).json({ error: "Access denied" });
            return;
        }

        // Requirement 9.2: Permanently delete all selected notifications
        const result = await getPrismaClient().notification.deleteMany({
            where: {
                id: { in: notificationIds },
                userId: userIdNum, // Extra safety check
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
 * 
 * This endpoint triggers a check for tasks with approaching or past due dates
 * and creates appropriate notifications for assignees.
 * 
 * Requirements validated:
 * - 3.1: Creates Info severity notification for near-overdue tasks (within 24 hours)
 * - 4.1: Creates Critical severity notification for overdue tasks
 * 
 * @param req - Express request object
 * @param res - Express response object
 */
export const checkDueDates = async (_req: Request, res: Response): Promise<void> => {
    try {
        // Call the notification service to check and create due date notifications
        await checkAndCreateDueDateNotifications();

        res.json({ 
            message: "Due date check completed successfully",
        });
    } catch (error: any) {
        console.error("Error checking due dates:", error.message);
        res.status(500).json({ error: `Database error: ${error.message}` });
    }
};
