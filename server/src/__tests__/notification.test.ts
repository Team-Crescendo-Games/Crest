import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockPrisma, mockReq, mockRes } from "./helpers.ts";

const prisma = createMockPrisma();
vi.mock("../lib/prisma.ts", () => ({ getPrismaClient: () => prisma }));
vi.mock("../services/notificationService.ts", () => ({
    checkAndCreateDueDateNotifications: vi.fn(),
}));

import {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    batchDeleteNotifications,
    checkDueDates,
} from "../controllers/notificationController.ts";

beforeEach(() => vi.clearAllMocks());

describe("GET /notifications", () => {
    it("returns notifications for user", async () => {
        const notifs = [{ id: 1, userId: 1, isRead: false }];
        prisma.notification.findMany.mockResolvedValue(notifs);
        const res = mockRes();
        await getNotifications(mockReq({ query: { userId: "1" } }), res);
        expect(res.json).toHaveBeenCalledWith(notifs);
    });

    it("returns 400 without userId", async () => {
        const res = mockRes();
        await getNotifications(mockReq(), res);
        expect(res.status).toHaveBeenCalledWith(400);
    });
});

describe("GET /notifications/unread-count", () => {
    it("returns unread count", async () => {
        prisma.notification.count.mockResolvedValue(5);
        const res = mockRes();
        await getUnreadCount(mockReq({ query: { userId: "1" } }), res);
        expect(res.json).toHaveBeenCalledWith({ count: 5 });
    });
});

describe("PATCH /notifications/:id/read", () => {
    it("marks notification as read", async () => {
        prisma.notification.findUnique.mockResolvedValue({ id: 1, userId: 1 });
        prisma.notification.update.mockResolvedValue({ id: 1, isRead: true });
        const res = mockRes();
        await markAsRead(mockReq({ params: { id: "1" }, query: { userId: "1" } }), res);
        expect(res.json).toHaveBeenCalled();
    });

    it("returns 403 for wrong user", async () => {
        prisma.notification.findUnique.mockResolvedValue({ id: 1, userId: 2 });
        const res = mockRes();
        await markAsRead(mockReq({ params: { id: "1" }, query: { userId: "1" } }), res);
        expect(res.status).toHaveBeenCalledWith(403);
    });

    it("returns 404 when not found", async () => {
        prisma.notification.findUnique.mockResolvedValue(null);
        const res = mockRes();
        await markAsRead(mockReq({ params: { id: "999" }, query: { userId: "1" } }), res);
        expect(res.status).toHaveBeenCalledWith(404);
    });
});

describe("PATCH /notifications/mark-all-read", () => {
    it("marks all as read", async () => {
        prisma.notification.updateMany.mockResolvedValue({ count: 3 });
        const res = mockRes();
        await markAllAsRead(mockReq({ query: { userId: "1" } }), res);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ count: 3 }));
    });
});

describe("DELETE /notifications/:id", () => {
    it("deletes a notification", async () => {
        prisma.notification.findUnique.mockResolvedValue({ id: 1, userId: 1 });
        prisma.notification.delete.mockResolvedValue({});
        const res = mockRes();
        await deleteNotification(mockReq({ params: { id: "1" }, query: { userId: "1" } }), res);
        expect(res.json).toHaveBeenCalled();
    });

    it("returns 403 for wrong user", async () => {
        prisma.notification.findUnique.mockResolvedValue({ id: 1, userId: 2 });
        const res = mockRes();
        await deleteNotification(mockReq({ params: { id: "1" }, query: { userId: "1" } }), res);
        expect(res.status).toHaveBeenCalledWith(403);
    });
});

describe("DELETE /notifications/batch", () => {
    it("batch deletes notifications", async () => {
        prisma.notification.findMany.mockResolvedValue([
            { id: 1, userId: 1 },
            { id: 2, userId: 1 },
        ]);
        prisma.notification.deleteMany.mockResolvedValue({ count: 2 });
        const res = mockRes();
        await batchDeleteNotifications(
            mockReq({ query: { userId: "1" }, body: { ids: [1, 2] } }),
            res
        );
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ count: 2 }));
    });

    it("returns 400 for missing ids", async () => {
        const res = mockRes();
        await batchDeleteNotifications(mockReq({ query: { userId: "1" }, body: {} }), res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 403 if notification belongs to another user", async () => {
        prisma.notification.findMany.mockResolvedValue([{ id: 1, userId: 2 }]);
        const res = mockRes();
        await batchDeleteNotifications(
            mockReq({ query: { userId: "1" }, body: { ids: [1] } }),
            res
        );
        expect(res.status).toHaveBeenCalledWith(403);
    });
});

describe("POST /notifications/check-due-dates", () => {
    it("runs due date check", async () => {
        const res = mockRes();
        await checkDueDates(mockReq(), res);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.any(String) })
        );
    });
});
