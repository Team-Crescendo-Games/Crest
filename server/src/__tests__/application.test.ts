import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockPrisma, mockReq, mockRes } from "./helpers.ts";

const prisma = createMockPrisma();
vi.mock("../lib/prisma.ts", () => ({ getPrismaClient: () => prisma }));

import {
    getDiscoverableWorkspaces,
    applyToWorkspace,
    getWorkspaceApplications,
    resolveApplication,
} from "../controllers/applicationController.ts";

beforeEach(() => vi.clearAllMocks());

describe("GET /workspaces/discover", () => {
    it("returns discoverable workspaces", async () => {
        prisma.workspace.findMany.mockResolvedValue([
            { id: 1, name: "Open WS", joinPolicy: 1, _count: { members: 3 } },
        ]);
        prisma.workspaceApplication.findMany.mockResolvedValue([]);
        const res = mockRes();
        await getDiscoverableWorkspaces(mockReq({ query: { userId: "1" } }), res);
        expect(res.json).toHaveBeenCalled();
    });

    it("returns 400 without userId", async () => {
        const res = mockRes();
        await getDiscoverableWorkspaces(mockReq(), res);
        expect(res.status).toHaveBeenCalledWith(400);
    });
});

describe("POST /workspaces/:workspaceId/apply", () => {
    it("creates an application for apply-to-join workspace", async () => {
        prisma.workspace.findUnique.mockResolvedValue({ id: 1, joinPolicy: 1 });
        prisma.workspaceMember.findUnique.mockResolvedValue(null);
        prisma.workspaceApplication.create.mockResolvedValue({ id: 1, status: 0 });
        const res = mockRes();
        await applyToWorkspace(mockReq({ params: { workspaceId: "1" }, body: { userId: 2 } }), res);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it("auto-joins discoverable workspace", async () => {
        prisma.workspace.findUnique.mockResolvedValue({ id: 1, joinPolicy: 2 });
        prisma.workspaceMember.findUnique.mockResolvedValue(null);
        prisma.role.findFirst.mockResolvedValue({ id: 3, name: "Member" });
        prisma.workspaceMember.create.mockResolvedValue({ userId: 2 });
        const res = mockRes();
        await applyToWorkspace(mockReq({ params: { workspaceId: "1" }, body: { userId: 2 } }), res);
        expect(res.status).toHaveBeenCalledWith(201);
        const result = (res.json as any).mock.calls[0][0];
        expect(result.joined).toBe(true);
    });

    it("rejects invite-only workspace", async () => {
        prisma.workspace.findUnique.mockResolvedValue({ id: 1, joinPolicy: 0 });
        const res = mockRes();
        await applyToWorkspace(mockReq({ params: { workspaceId: "1" }, body: { userId: 2 } }), res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("rejects if already a member", async () => {
        prisma.workspace.findUnique.mockResolvedValue({ id: 1, joinPolicy: 1 });
        prisma.workspaceMember.findUnique.mockResolvedValue({ userId: 2 });
        const res = mockRes();
        await applyToWorkspace(mockReq({ params: { workspaceId: "1" }, body: { userId: 2 } }), res);
        expect(res.status).toHaveBeenCalledWith(400);
    });
});

describe("GET /workspaces/:workspaceId/applications", () => {
    it("returns applications", async () => {
        prisma.workspaceApplication.findMany.mockResolvedValue([{ id: 1 }]);
        const res = mockRes();
        await getWorkspaceApplications(mockReq({ params: { workspaceId: "1" }, query: {} }), res);
        expect(res.json).toHaveBeenCalled();
    });
});

describe("PATCH /workspaces/:workspaceId/applications/:applicationId", () => {
    it("approves an application", async () => {
        prisma.workspaceApplication.findFirst.mockResolvedValue({ id: 1, userId: 2, status: 0 });
        prisma.role.findFirst.mockResolvedValue({ id: 3, name: "Member" });
        prisma.workspaceApplication.update.mockResolvedValue({ id: 1, status: 1 });
        prisma.workspaceMember.create.mockResolvedValue({});
        prisma.workspaceApplication.findUnique.mockResolvedValue({ id: 1, status: 1 });
        const res = mockRes();
        await resolveApplication(
            mockReq({
                params: { workspaceId: "1", applicationId: "1" },
                body: { action: "approve" },
            }),
            res
        );
        expect(res.json).toHaveBeenCalled();
    });

    it("rejects an application", async () => {
        prisma.workspaceApplication.findFirst.mockResolvedValue({ id: 1, userId: 2, status: 0 });
        prisma.workspaceApplication.update.mockResolvedValue({ id: 1, status: 2 });
        prisma.workspaceApplication.findUnique.mockResolvedValue({ id: 1, status: 2 });
        const res = mockRes();
        await resolveApplication(
            mockReq({
                params: { workspaceId: "1", applicationId: "1" },
                body: { action: "reject" },
            }),
            res
        );
        expect(res.json).toHaveBeenCalled();
    });

    it("returns 400 for invalid action", async () => {
        const res = mockRes();
        await resolveApplication(
            mockReq({
                params: { workspaceId: "1", applicationId: "1" },
                body: { action: "invalid" },
            }),
            res
        );
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 for missing application", async () => {
        prisma.workspaceApplication.findFirst.mockResolvedValue(null);
        const res = mockRes();
        await resolveApplication(
            mockReq({
                params: { workspaceId: "1", applicationId: "999" },
                body: { action: "approve" },
            }),
            res
        );
        expect(res.status).toHaveBeenCalledWith(404);
    });
});
