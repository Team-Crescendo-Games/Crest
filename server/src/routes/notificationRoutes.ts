import { Router } from "express";
import {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    batchDeleteNotifications,
    checkDueDates,
} from "../controllers/notificationController.ts";

const router = Router();

// GET / - Get all notifications for current user
// Requirements: 7.1
router.get("/", getNotifications);

// GET /unread-count - Get unread notification count
// Requirements: 10.1
router.get("/unread-count", getUnreadCount);

// PATCH /:id/read - Mark single notification as read
// Requirements: 8.1
router.patch("/:id/read", markAsRead);

// PATCH /mark-all-read - Mark all notifications as read
// Requirements: 8.2
router.patch("/mark-all-read", markAllAsRead);

// DELETE /batch - Delete multiple notifications (must be before /:id to avoid route conflict)
// Requirements: 9.2
router.delete("/batch", batchDeleteNotifications);

// DELETE /:id - Delete single notification
// Requirements: 9.1
router.delete("/:id", deleteNotification);

// POST /check-due-dates - Trigger due date notification check
// Requirements: 3.1, 4.1
router.post("/check-due-dates", checkDueDates);

export default router;
