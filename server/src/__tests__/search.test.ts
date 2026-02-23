import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockPrisma, mockReq, mockRes } from "./helpers.ts";

const prisma = createMockPrisma();
vi.mock("../lib/prisma.ts", () => ({ getPrismaClient: () => prisma }));

import { search } from "../controllers/searchController.ts";

beforeEach(() => vi.clearAllMocks());

describe("GET /search", () => {
    it("returns search results across all categories", async () => {
        prisma.task.findMany.mockResolvedValue([{ id: 1, title: "Fix bug", status: 0 }]);
        prisma.board.findMany.mockResolvedValue([{ id: 1, name: "Main Board" }]);
        prisma.user.findMany.mockResolvedValue([{ userId: 1, username: "alice" }]);
        prisma.sprint.findMany.mockResolvedValue([{ id: 1, title: "Sprint 1" }]);
        const res = mockRes();
        await search(mockReq({ query: { query: "test", workspaceId: "1" } }), res);
        expect(res.json).toHaveBeenCalled();
        const result = (res.json as any).mock.calls[0][0];
        expect(result).toHaveProperty("tasks");
        expect(result).toHaveProperty("boards");
        expect(result).toHaveProperty("users");
        expect(result).toHaveProperty("sprints");
    });

    it("returns 400 without workspaceId", async () => {
        const res = mockRes();
        await search(mockReq({ query: { query: "test" } }), res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("searches only specified categories", async () => {
        prisma.task.findMany.mockResolvedValue([]);
        const res = mockRes();
        await search(
            mockReq({ query: { query: "test", workspaceId: "1", categories: "tasks" } }),
            res
        );
        expect(res.json).toHaveBeenCalled();
        const result = (res.json as any).mock.calls[0][0];
        expect(result).toHaveProperty("tasks");
        expect(result).not.toHaveProperty("boards");
    });
});
