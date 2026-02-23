import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockPrisma, mockReq, mockRes } from "./helpers.ts";

const prisma = createMockPrisma();
vi.mock("../lib/prisma.ts", () => ({ getPrismaClient: () => prisma }));

import { getPointsAnalytics } from "../controllers/analyticsController.ts";

beforeEach(() => vi.clearAllMocks());

describe("GET /analytics/points", () => {
    it("returns points data grouped by week", async () => {
        prisma.task.findMany.mockResolvedValue([
            { id: 1, points: 5, dueDate: new Date("2026-01-05") },
        ]);
        const res = mockRes();
        await getPointsAnalytics(
            mockReq({
                query: {
                    userId: "1",
                    workspaceId: "1",
                    groupBy: "week",
                    startDate: "2026-01-01T00:00:00Z",
                    endDate: "2026-02-01T00:00:00Z",
                },
            }) as any,
            res as any
        );
        expect(res.json).toHaveBeenCalled();
        const result = (res.json as any).mock.calls[0][0];
        expect(Array.isArray(result)).toBe(true);
    });

    it("returns 400 without userId", async () => {
        const res = mockRes();
        await getPointsAnalytics(
            mockReq({
                query: {
                    workspaceId: "1",
                    groupBy: "week",
                    startDate: "2026-01-01",
                    endDate: "2026-02-01",
                },
            }) as any,
            res as any
        );
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 without workspaceId", async () => {
        const res = mockRes();
        await getPointsAnalytics(
            mockReq({
                query: {
                    userId: "1",
                    groupBy: "week",
                    startDate: "2026-01-01",
                    endDate: "2026-02-01",
                },
            }) as any,
            res as any
        );
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 for invalid groupBy", async () => {
        const res = mockRes();
        await getPointsAnalytics(
            mockReq({
                query: {
                    userId: "1",
                    workspaceId: "1",
                    groupBy: "day",
                    startDate: "2026-01-01",
                    endDate: "2026-02-01",
                },
            }) as any,
            res as any
        );
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 when startDate >= endDate", async () => {
        const res = mockRes();
        await getPointsAnalytics(
            mockReq({
                query: {
                    userId: "1",
                    workspaceId: "1",
                    groupBy: "week",
                    startDate: "2026-02-01",
                    endDate: "2026-01-01",
                },
            }) as any,
            res as any
        );
        expect(res.status).toHaveBeenCalledWith(400);
    });
});
