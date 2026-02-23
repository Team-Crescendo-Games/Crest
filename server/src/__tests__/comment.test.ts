import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockPrisma, mockReq, mockRes } from "./helpers.ts";

const prisma = createMockPrisma();
vi.mock("../lib/prisma.ts", () => ({ getPrismaClient: () => prisma }));
vi.mock("../services/notificationService.ts", () => ({
    createMentionNotifications: vi.fn(),
}));

import { createComment, toggleCommentResolved } from "../controllers/commentController.ts";

beforeEach(() => vi.clearAllMocks());

describe("POST /comments", () => {
    it("creates a comment", async () => {
        prisma.user.findUnique.mockResolvedValue({ userId: 1 });
        const comment = { id: 1, text: "Hello", taskId: 1, userId: 1, user: { userId: 1 } };
        prisma.comment.create.mockResolvedValue(comment);
        const res = mockRes();
        await createComment(mockReq({ body: { taskId: 1, userId: 1, text: "Hello" } }), res);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(comment);
    });

    it("returns 400 for missing fields", async () => {
        const res = mockRes();
        await createComment(mockReq({ body: { taskId: 1 } }), res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 for non-numeric ids", async () => {
        const res = mockRes();
        await createComment(mockReq({ body: { taskId: "abc", userId: "xyz", text: "Hi" } }), res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 when user not found", async () => {
        prisma.user.findUnique.mockResolvedValue(null);
        const res = mockRes();
        await createComment(mockReq({ body: { taskId: 1, userId: 999, text: "Hi" } }), res);
        expect(res.status).toHaveBeenCalledWith(404);
    });
});

describe("PATCH /comments/:commentId/resolved", () => {
    it("toggles resolved status", async () => {
        prisma.comment.findUnique.mockResolvedValue({ id: 1, isResolved: false });
        prisma.comment.update.mockResolvedValue({ id: 1, isResolved: true });
        const res = mockRes();
        await toggleCommentResolved(mockReq({ params: { commentId: "1" } }), res);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ isResolved: true }));
    });

    it("returns 404 when comment not found", async () => {
        prisma.comment.findUnique.mockResolvedValue(null);
        const res = mockRes();
        await toggleCommentResolved(mockReq({ params: { commentId: "999" } }), res);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 400 for invalid id", async () => {
        const res = mockRes();
        await toggleCommentResolved(mockReq({ params: { commentId: "abc" } }), res);
        expect(res.status).toHaveBeenCalledWith(400);
    });
});
