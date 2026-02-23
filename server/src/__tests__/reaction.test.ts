import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockPrisma, mockReq, mockRes } from "./helpers.ts";

const prisma = createMockPrisma();
vi.mock("../lib/prisma.ts", () => ({ getPrismaClient: () => prisma }));

import { toggleReaction, getReactionsByComment } from "../controllers/reactionController.ts";

beforeEach(() => vi.clearAllMocks());

describe("POST /reactions/toggle", () => {
    it("adds a reaction when none exists", async () => {
        prisma.comment.findUnique.mockResolvedValue({ id: 1 });
        prisma.commentReaction.findUnique.mockResolvedValue(null);
        const reaction = { id: 1, commentId: 1, userId: 1, emoji: "FeelingYes" };
        prisma.commentReaction.create.mockResolvedValue(reaction);
        const res = mockRes();
        await toggleReaction(
            mockReq({ body: { commentId: 1, userId: 1, emoji: "FeelingYes" } }),
            res
        );
        expect(res.json).toHaveBeenCalledWith(reaction);
    });

    it("removes a reaction when it exists", async () => {
        prisma.comment.findUnique.mockResolvedValue({ id: 1 });
        prisma.commentReaction.findUnique.mockResolvedValue({ id: 1 });
        prisma.commentReaction.delete.mockResolvedValue({});
        const res = mockRes();
        await toggleReaction(
            mockReq({ body: { commentId: 1, userId: 1, emoji: "FeelingYes" } }),
            res
        );
        expect(res.json).toHaveBeenCalledWith(null);
    });

    it("returns 400 for invalid emoji", async () => {
        const res = mockRes();
        await toggleReaction(
            mockReq({ body: { commentId: 1, userId: 1, emoji: "InvalidEmoji" } }),
            res
        );
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 when comment not found", async () => {
        prisma.comment.findUnique.mockResolvedValue(null);
        const res = mockRes();
        await toggleReaction(
            mockReq({ body: { commentId: 999, userId: 1, emoji: "FeelingYes" } }),
            res
        );
        expect(res.status).toHaveBeenCalledWith(404);
    });
});

describe("GET /reactions/comment/:commentId", () => {
    it("returns reactions for a comment", async () => {
        const reactions = [{ id: 1, emoji: "FeelingYes", commentId: 1 }];
        prisma.commentReaction.findMany.mockResolvedValue(reactions);
        const res = mockRes();
        await getReactionsByComment(mockReq({ params: { commentId: "1" } }), res);
        expect(res.json).toHaveBeenCalledWith(reactions);
    });
});
