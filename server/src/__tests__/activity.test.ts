import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockPrisma, mockReq, mockRes } from "./helpers.ts";

const prisma = createMockPrisma();
vi.mock("../lib/prisma.ts", () => ({ getPrismaClient: () => prisma }));

import {
    getActivitiesByTask,
    createActivity,
    ActivityType,
} from "../controllers/activityController.ts";

beforeEach(() => vi.clearAllMocks());

describe("GET /activities", () => {
    it("returns activities for a task", async () => {
        prisma.task.findUnique.mockResolvedValue({ id: 1 });
        const activities = [{ id: 1, taskId: 1, activityType: 0 }];
        prisma.activity.findMany.mockResolvedValue(activities);
        const res = mockRes();
        await getActivitiesByTask(mockReq({ query: { taskId: "1" } }), res);
        expect(res.json).toHaveBeenCalledWith(activities);
    });

    it("returns 400 without taskId", async () => {
        const res = mockRes();
        await getActivitiesByTask(mockReq(), res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 for non-numeric taskId", async () => {
        const res = mockRes();
        await getActivitiesByTask(mockReq({ query: { taskId: "abc" } }), res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 when task not found", async () => {
        prisma.task.findUnique.mockResolvedValue(null);
        const res = mockRes();
        await getActivitiesByTask(mockReq({ query: { taskId: "999" } }), res);
        expect(res.status).toHaveBeenCalledWith(404);
    });
});

describe("createActivity (internal)", () => {
    it("creates a CREATE_TASK activity", async () => {
        prisma.activity.create.mockResolvedValue({ id: 1, activityType: 0 });
        const result = await createActivity({
            taskId: 1,
            userId: 1,
            activityType: ActivityType.CREATE_TASK,
        });
        expect(result).toEqual(expect.objectContaining({ activityType: 0 }));
    });

    it("throws for MOVE_TASK without statuses", async () => {
        await expect(
            createActivity({ taskId: 1, userId: 1, activityType: ActivityType.MOVE_TASK })
        ).rejects.toThrow("previousStatus and newStatus");
    });

    it("throws for EDIT_TASK without editField", async () => {
        await expect(
            createActivity({ taskId: 1, userId: 1, activityType: ActivityType.EDIT_TASK })
        ).rejects.toThrow("editField");
    });
});
