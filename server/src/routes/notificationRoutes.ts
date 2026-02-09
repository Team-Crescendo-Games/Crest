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

router.get("/", getNotifications);
router.get("/unread-count", getUnreadCount);
router.patch("/:id/read", markAsRead);
router.patch("/mark-all-read", markAllAsRead);
router.delete("/batch", batchDeleteNotifications);
router.delete("/:id", deleteNotification);
router.post("/check-due-dates", checkDueDates);

export default router;
