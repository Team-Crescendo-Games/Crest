import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockPrisma, mockReq, mockRes } from "./helpers.ts";

const prisma = createMockPrisma();
vi.mock("../lib/prisma.ts", () => ({ getPrismaClient: () => prisma }));

import {
    getUserWorkspaces,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    getWorkspaceMembers,
    addWorkspaceMember,
    removeWorkspaceMember,
    updateMemberRole,
    updateWorkspaceIcon,
    updateWorkspaceHeader,
} from "../controllers/workspaceController.ts";

beforeEach(() => vi.clearAllMocks());

describe("GET /workspaces", () => {
    it("returns workspaces for user", async () => {
        prisma.workspaceMember.findMany.mockResolvedValue([{ workspace: { id: 1, name: "WS1" } }]);
        const res = mockRes();
        await getUserWorkspaces(mockReq({ query: { userId: "1" } }), res);
        expect(res.json).toHaveBeenCalledWith([{ id: 1, name: "WS1" }]);
    });

    it("returns 400 without userId", async () => {
        const res = mockRes();
        await getUserWorkspaces(mockReq(), res);
        expect(res.status).toHaveBeenCalledWith(400);
    });
});

describe("POST /workspaces", () => {
    it("creates workspace with default roles", async () => {
        const ws = { id: 1, name: "New WS" };
        // $transaction calls the callback with the prisma proxy
        prisma.workspace.create.mockResolvedValue(ws);
        prisma.role.create.mockResolvedValue({ id: 1 });
        prisma.workspaceMember.create.mockResolvedValue({});
        const res = mockRes();
        await createWorkspace(mockReq({ body: { name: "New WS", userId: 1 } }), res);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it("returns 400 without name", async () => {
        const res = mockRes();
        await createWorkspace(mockReq({ body: { userId: 1 } }), res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 for name over 64 chars", async () => {
        const res = mockRes();
        await createWorkspace(mockReq({ body: { name: "a".repeat(65), userId: 1 } }), res);
        expect(res.status).toHaveBeenCalledWith(400);
    });
});

describe("PATCH /workspaces/:workspaceId", () => {
    it("updates workspace", async () => {
        prisma.workspace.update.mockResolvedValue({ id: 1, name: "Updated" });
        const res = mockRes();
        await updateWorkspace(
            mockReq({ params: { workspaceId: "1" }, body: { name: "Updated" } }),
            res
        );
        expect(res.json).toHaveBeenCalled();
    });
});

describe("DELETE /workspaces/:workspaceId", () => {
    it("deletes workspace", async () => {
        prisma.workspace.delete.mockResolvedValue({});
        const res = mockRes();
        await deleteWorkspace(mockReq({ params: { workspaceId: "1" } }), res);
        expect(res.status).toHaveBeenCalledWith(204);
    });
});

describe("GET /workspaces/:workspaceId/members", () => {
    it("returns members", async () => {
        const members = [{ userId: 1, role: { name: "Admin" } }];
        prisma.workspaceMember.findMany.mockResolvedValue(members);
        const res = mockRes();
        await getWorkspaceMembers(mockReq({ params: { workspaceId: "1" } }), res);
        expect(res.json).toHaveBeenCalledWith(members);
    });
});

describe("POST /workspaces/:workspaceId/members", () => {
    it("adds member by email", async () => {
        prisma.user.findFirst.mockResolvedValue({ userId: 2, email: "bob@test.com" });
        prisma.workspaceMember.findUnique.mockResolvedValue(null);
        prisma.role.findFirst.mockResolvedValue({ id: 3, name: "Member" });
        prisma.workspaceMember.create.mockResolvedValue({ userId: 2, workspaceId: 1 });
        const res = mockRes();
        await addWorkspaceMember(
            mockReq({ params: { workspaceId: "1" }, body: { email: "bob@test.com" } }),
            res
        );
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it("returns 400 without email", async () => {
        const res = mockRes();
        await addWorkspaceMember(mockReq({ params: { workspaceId: "1" }, body: {} }), res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 when user not found", async () => {
        prisma.user.findFirst.mockResolvedValue(null);
        const res = mockRes();
        await addWorkspaceMember(
            mockReq({ params: { workspaceId: "1" }, body: { email: "nobody@test.com" } }),
            res
        );
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 400 if already a member", async () => {
        prisma.user.findFirst.mockResolvedValue({ userId: 2 });
        prisma.workspaceMember.findUnique.mockResolvedValue({ userId: 2 });
        const res = mockRes();
        await addWorkspaceMember(
            mockReq({ params: { workspaceId: "1" }, body: { email: "bob@test.com" } }),
            res
        );
        expect(res.status).toHaveBeenCalledWith(400);
    });
});

describe("DELETE /workspaces/:workspaceId/members/:userId", () => {
    it("removes a member", async () => {
        prisma.workspace.findUnique.mockResolvedValue({ id: 1, createdById: 99 });
        prisma.workspaceMember.findUnique.mockResolvedValue({ role: { name: "Member" } });
        prisma.workspaceMember.delete.mockResolvedValue({});
        const res = mockRes();
        await removeWorkspaceMember(mockReq({ params: { workspaceId: "1", userId: "2" } }), res);
        expect(res.status).toHaveBeenCalledWith(204);
    });

    it("prevents removing workspace creator", async () => {
        prisma.workspace.findUnique.mockResolvedValue({ id: 1, createdById: 2 });
        prisma.workspaceMember.delete.mockResolvedValue({});
        const res = mockRes();
        await removeWorkspaceMember(mockReq({ params: { workspaceId: "1", userId: "2" } }), res);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ error: "Cannot remove the workspace owner" })
        );
    });
});

describe("PATCH /workspaces/:workspaceId/members/:userId/role", () => {
    it("updates member role", async () => {
        prisma.workspace.findUnique.mockResolvedValue({ id: 1, createdById: 99 });
        prisma.role.findFirst.mockResolvedValue({ id: 3, workspaceId: 1 });
        prisma.workspaceMember.update.mockResolvedValue({ userId: 2, roleId: 3 });
        const res = mockRes();
        await updateMemberRole(
            mockReq({ params: { workspaceId: "1", userId: "2" }, body: { roleId: 3, userId: 1 } }),
            res
        );
        expect(res.json).toHaveBeenCalled();
    });

    it("prevents changing creator's role", async () => {
        prisma.workspace.findUnique.mockResolvedValue({ id: 1, createdById: 2 });
        const res = mockRes();
        await updateMemberRole(
            mockReq({ params: { workspaceId: "1", userId: "2" }, body: { roleId: 3, userId: 1 } }),
            res
        );
        expect(res.status).toHaveBeenCalledWith(400);
    });
});

describe("PATCH /workspaces/:workspaceId/icon", () => {
    it("updates icon", async () => {
        prisma.workspace.update.mockResolvedValue({ id: 1, iconExt: "png" });
        const res = mockRes();
        await updateWorkspaceIcon(
            mockReq({ params: { workspaceId: "1" }, body: { iconExt: "png" } }),
            res
        );
        expect(res.json).toHaveBeenCalled();
    });
});

describe("PATCH /workspaces/:workspaceId/header", () => {
    it("updates header", async () => {
        prisma.workspace.update.mockResolvedValue({ id: 1, headerExt: "jpg" });
        const res = mockRes();
        await updateWorkspaceHeader(
            mockReq({ params: { workspaceId: "1" }, body: { headerExt: "jpg" } }),
            res
        );
        expect(res.json).toHaveBeenCalled();
    });
});
