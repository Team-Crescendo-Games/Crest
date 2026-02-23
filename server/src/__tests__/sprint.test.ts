import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockPrisma, mockReq, mockRes } from "./helpers.ts";

const prisma = createMockPrisma();
vi.mock("../lib/prisma.ts", () => ({ getPrismaClient: () => prisma }));

import {
    getSprints,
    getSprint,
    createSprint,
    updateSprint,
    deleteSprint,
    addTaskToSprint,
    removeTaskFromSprint,
    archiveSprint,
    duplicateSprint,
} from "../controllers/sprintController.ts";

beforeEach(() => vi.clearAllMocks());

describe("GET /sprints", () => {
    it("returns sprints for workspace", async () => {
        const sprints = [{ id: 1, title: "Sprint 1", workspaceId: 1 }];
        prisma.sprint.findMany.mockResolvedValue(sprints);
        const res = mockRes();
        await getSprints(mockReq({ query: { workspaceId: "1" } }), res);
        expect(res.json).toHaveBeenCalledWith(sprints);
    });

    it("returns 400 without workspaceId", async () => {
        const res = mockRes();
        await getSprints(mockReq(), res);
        expect(res.status).toHaveBeenCalledWith(400);
    });
});

describe("GET /sprints/:sprintId", () => {
    it("returns sprint with tasks", async () => {
        const sprint = {
            id: 1,
            title: "Sprint 1",
            sprintTasks: [
                {
                    task: {
                        id: 1,
                        status: 0,
                        subtasks: [],
                        sprintTasks: [],
                        comments: [],
                        attachments: [],
                        activities: [],
                        taskTags: [],
                        taskAssignments: [],
                        parentTask: null,
                        author: { userId: 1 },
                    },
                },
            ],
        };
        prisma.sprint.findUnique.mockResolvedValue(sprint);
        const res = mockRes();
        await getSprint(mockReq({ params: { sprintId: "1" } }), res);
        expect(res.json).toHaveBeenCalled();
    });

    it("returns 404 when not found", async () => {
        prisma.sprint.findUnique.mockResolvedValue(null);
        const res = mockRes();
        await getSprint(mockReq({ params: { sprintId: "999" } }), res);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 400 for invalid id", async () => {
        const res = mockRes();
        await getSprint(mockReq({ params: { sprintId: "abc" } }), res);
        expect(res.status).toHaveBeenCalledWith(400);
    });
});

describe("POST /sprints", () => {
    it("creates a sprint", async () => {
        const sprint = { id: 1, title: "New Sprint", workspaceId: 1 };
        prisma.sprint.create.mockResolvedValue(sprint);
        const res = mockRes();
        await createSprint(mockReq({ body: { title: "New Sprint", workspaceId: 1 } }), res);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it("returns 400 without title", async () => {
        const res = mockRes();
        await createSprint(mockReq({ body: { title: "", workspaceId: 1 } }), res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 without workspaceId", async () => {
        const res = mockRes();
        await createSprint(mockReq({ body: { title: "Sprint" } }), res);
        expect(res.status).toHaveBeenCalledWith(400);
    });
});

describe("PATCH /sprints/:sprintId", () => {
    it("updates a sprint", async () => {
        prisma.sprint.findUnique.mockResolvedValue({ id: 1 });
        prisma.sprint.update.mockResolvedValue({ id: 1, title: "Updated" });
        const res = mockRes();
        await updateSprint(mockReq({ params: { sprintId: "1" }, body: { title: "Updated" } }), res);
        expect(res.json).toHaveBeenCalled();
    });

    it("returns 404 when not found", async () => {
        prisma.sprint.findUnique.mockResolvedValue(null);
        const res = mockRes();
        await updateSprint(mockReq({ params: { sprintId: "999" }, body: { title: "X" } }), res);
        expect(res.status).toHaveBeenCalledWith(404);
    });
});

describe("DELETE /sprints/:sprintId", () => {
    it("deletes a sprint", async () => {
        prisma.sprint.findUnique.mockResolvedValue({ id: 1 });
        prisma.sprint.delete.mockResolvedValue({});
        const res = mockRes();
        await deleteSprint(mockReq({ params: { sprintId: "1" } }), res);
        expect(res.status).toHaveBeenCalledWith(204);
    });

    it("returns 404 when not found", async () => {
        prisma.sprint.findUnique.mockResolvedValue(null);
        const res = mockRes();
        await deleteSprint(mockReq({ params: { sprintId: "999" } }), res);
        expect(res.status).toHaveBeenCalledWith(404);
    });
});

describe("POST /sprints/:sprintId/tasks/:taskId", () => {
    it("adds task to sprint", async () => {
        prisma.sprint.findUnique.mockResolvedValue({ id: 1 });
        prisma.task.findUnique.mockResolvedValue({ id: 2 });
        prisma.sprintTask.findUnique.mockResolvedValue(null);
        prisma.sprintTask.create.mockResolvedValue({ sprintId: 1, taskId: 2 });
        const res = mockRes();
        await addTaskToSprint(mockReq({ params: { sprintId: "1", taskId: "2" } }), res);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it("returns 200 if already associated", async () => {
        prisma.sprint.findUnique.mockResolvedValue({ id: 1 });
        prisma.task.findUnique.mockResolvedValue({ id: 2 });
        prisma.sprintTask.findUnique.mockResolvedValue({ sprintId: 1, taskId: 2 });
        const res = mockRes();
        await addTaskToSprint(mockReq({ params: { sprintId: "1", taskId: "2" } }), res);
        expect(res.statusCode).toBe(200);
    });

    it("returns 404 if sprint not found", async () => {
        prisma.sprint.findUnique.mockResolvedValue(null);
        const res = mockRes();
        await addTaskToSprint(mockReq({ params: { sprintId: "999", taskId: "1" } }), res);
        expect(res.status).toHaveBeenCalledWith(404);
    });
});

describe("DELETE /sprints/:sprintId/tasks/:taskId", () => {
    it("removes task from sprint", async () => {
        prisma.sprint.findUnique.mockResolvedValue({ id: 1 });
        prisma.task.findUnique.mockResolvedValue({ id: 2 });
        prisma.sprintTask.deleteMany.mockResolvedValue({ count: 1 });
        const res = mockRes();
        await removeTaskFromSprint(mockReq({ params: { sprintId: "1", taskId: "2" } }), res);
        expect(res.status).toHaveBeenCalledWith(204);
    });
});

describe("PATCH /sprints/:sprintId/archive", () => {
    it("toggles isActive", async () => {
        prisma.sprint.findUnique.mockResolvedValue({ id: 1, isActive: true });
        prisma.sprint.update.mockResolvedValue({ id: 1, isActive: false });
        const res = mockRes();
        await archiveSprint(mockReq({ params: { sprintId: "1" } }), res);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }));
    });
});

describe("POST /sprints/:sprintId/duplicate", () => {
    it("duplicates a sprint", async () => {
        prisma.sprint.findUnique
            .mockResolvedValueOnce({
                id: 1,
                title: "Sprint 1",
                workspaceId: 1,
                startDate: null,
                dueDate: null,
                sprintTasks: [{ taskId: 10, task: { id: 10, status: 0 } }],
            })
            .mockResolvedValueOnce({
                id: 2,
                title: "Copy of Sprint 1",
                _count: { sprintTasks: 1 },
            });
        prisma.sprint.create.mockResolvedValue({ id: 2 });
        prisma.sprintTask.createMany.mockResolvedValue({ count: 1 });
        const res = mockRes();
        await duplicateSprint(mockReq({ params: { sprintId: "1" }, body: {} }), res);
        expect(res.status).toHaveBeenCalledWith(201);
    });
});
