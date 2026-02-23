import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockPrisma, mockReq, mockRes } from "./helpers.ts";

const prisma = createMockPrisma();
vi.mock("../lib/prisma.ts", () => ({ getPrismaClient: () => prisma }));
vi.mock("../services/notificationService.ts", () => ({
    createTaskEditNotifications: vi.fn(),
    createReassignmentNotifications: vi.fn(),
    createNotification: vi.fn(),
    NotificationType: {
        MENTION: 0,
        NEAR_OVERDUE: 1,
        OVERDUE: 2,
        TASK_EDITED: 3,
        TASK_REASSIGNED: 4,
    },
    NotificationSeverity: { INFO: 0, MEDIUM: 1, CRITICAL: 2 },
}));

import {
    getTasks,
    getTaskById,
    createTask,
    updateTaskStatus,
    updateTask,
    getUserTasks,
    getTasksAssignedToUser,
    getTasksAuthoredByUser,
    deleteTask,
} from "../controllers/taskController.ts";

const fakeTask = {
    id: 1,
    title: "Test",
    status: 0,
    boardId: 1,
    authorUserId: 1,
    subtasks: [],
    sprintTasks: [],
    taskAssignments: [],
    comments: [],
    attachments: [],
    taskTags: [],
    activities: [],
    parentTask: null,
    author: { userId: 1, username: "alice" },
};

beforeEach(() => vi.clearAllMocks());

describe("GET /tasks", () => {
    it("returns tasks for a board", async () => {
        prisma.task.findMany.mockResolvedValue([fakeTask]);
        const res = mockRes();
        await getTasks(mockReq({ query: { boardId: "1" } }), res);
        expect(res.json).toHaveBeenCalled();
        const result = (res.json as any).mock.calls[0][0];
        expect(result[0].status).toBe("Input Queue");
    });

    it("returns 400 without boardId", async () => {
        const res = mockRes();
        await getTasks(mockReq(), res);
        expect(res.status).toHaveBeenCalledWith(400);
    });
});

describe("GET /tasks/:taskId", () => {
    it("returns a task by id", async () => {
        prisma.task.findUnique.mockResolvedValue(fakeTask);
        const res = mockRes();
        await getTaskById(mockReq({ params: { taskId: "1" } }), res);
        expect(res.json).toHaveBeenCalled();
    });

    it("returns 404 when not found", async () => {
        prisma.task.findUnique.mockResolvedValue(null);
        const res = mockRes();
        await getTaskById(mockReq({ params: { taskId: "999" } }), res);
        expect(res.status).toHaveBeenCalledWith(404);
    });
});

describe("POST /tasks", () => {
    it("creates a task", async () => {
        prisma.task.create.mockResolvedValue(fakeTask);
        prisma.activity.create.mockResolvedValue({ id: 1 });
        const res = mockRes();
        await createTask(mockReq({ body: { title: "Test", boardId: 1, authorUserId: 1 } }), res);
        expect(res.status).toHaveBeenCalledWith(201);
    });
});

describe("PATCH /tasks/:taskId/status", () => {
    it("updates task status", async () => {
        prisma.task.findUnique.mockResolvedValue({ id: 1, status: 0 });
        prisma.task.update.mockResolvedValue({ id: 1, status: 1 });
        prisma.activity.create.mockResolvedValue({ id: 1 });
        prisma.activity.findFirst.mockResolvedValue({ id: 1 });
        const res = mockRes();
        await updateTaskStatus(
            mockReq({ params: { taskId: "1" }, body: { status: "Work In Progress", userId: 1 } }),
            res
        );
        expect(res.json).toHaveBeenCalled();
    });
});

describe("PATCH /tasks/:taskId (updateTask)", () => {
    it("updates task title", async () => {
        prisma.task.findUnique.mockResolvedValue({ ...fakeTask, taskTags: [] });
        prisma.task.update.mockResolvedValue({ ...fakeTask, title: "Updated" });
        prisma.activity.create.mockResolvedValue({ id: 1 });
        prisma.activity.findFirst.mockResolvedValue({ id: 1 });
        const res = mockRes();
        await updateTask(
            mockReq({ params: { taskId: "1" }, body: { title: "Updated", userId: 1 } }),
            res
        );
        expect(res.json).toHaveBeenCalled();
    });
});

describe("GET /tasks/user/:userId", () => {
    it("returns user tasks", async () => {
        prisma.task.findMany.mockResolvedValue([fakeTask]);
        const res = mockRes();
        await getUserTasks(mockReq({ params: { userId: "1" } }), res);
        expect(res.json).toHaveBeenCalled();
    });
});

describe("GET /tasks/user/:userId/assigned", () => {
    it("returns assigned tasks", async () => {
        prisma.task.findMany.mockResolvedValue([fakeTask]);
        const res = mockRes();
        await getTasksAssignedToUser(mockReq({ params: { userId: "1" } }), res);
        expect(res.json).toHaveBeenCalled();
    });
});

describe("GET /tasks/user/:userId/authored", () => {
    it("returns authored tasks", async () => {
        prisma.task.findMany.mockResolvedValue([fakeTask]);
        const res = mockRes();
        await getTasksAuthoredByUser(mockReq({ params: { userId: "1" } }), res);
        expect(res.json).toHaveBeenCalled();
    });
});

describe("DELETE /tasks/:taskId", () => {
    it("deletes a task", async () => {
        prisma.task.delete.mockResolvedValue({});
        const res = mockRes();
        await deleteTask(mockReq({ params: { taskId: "1" } }), res);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.any(String) })
        );
    });
});
