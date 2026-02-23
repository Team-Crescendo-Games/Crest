import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockPrisma, mockReq, mockRes } from "./helpers.ts";

const prisma = createMockPrisma();
vi.mock("../lib/prisma.ts", () => ({ getPrismaClient: () => prisma }));

import { getRoles, createRole, updateRole, deleteRole } from "../controllers/roleController.ts";

beforeEach(() => vi.clearAllMocks());

describe("GET /workspaces/:workspaceId/roles", () => {
    it("returns roles", async () => {
        const roles = [{ id: 1, name: "Admin", workspaceId: 1 }];
        prisma.role.findMany.mockResolvedValue(roles);
        const res = mockRes();
        await getRoles(mockReq({ params: { workspaceId: "1" } }), res);
        expect(res.json).toHaveBeenCalledWith(roles);
    });
});

describe("POST /workspaces/:workspaceId/roles", () => {
    it("creates a custom role", async () => {
        const role = { id: 4, name: "Tester", workspaceId: 1 };
        prisma.role.create.mockResolvedValue(role);
        const res = mockRes();
        await createRole(mockReq({ params: { workspaceId: "1" }, body: { name: "Tester" } }), res);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it("rejects reserved names", async () => {
        for (const name of ["Owner", "Admin", "Member"]) {
            const res = mockRes();
            await createRole(mockReq({ params: { workspaceId: "1" }, body: { name } }), res);
            expect(res.status).toHaveBeenCalledWith(400);
        }
    });

    it("returns 400 on duplicate name", async () => {
        const err: any = new Error("dup");
        err.code = "P2002";
        prisma.role.create.mockRejectedValue(err);
        const res = mockRes();
        await createRole(
            mockReq({ params: { workspaceId: "1" }, body: { name: "Existing" } }),
            res
        );
        expect(res.status).toHaveBeenCalledWith(400);
    });
});

describe("PATCH /workspaces/:workspaceId/roles/:roleId", () => {
    it("updates a custom role", async () => {
        prisma.role.findFirst.mockResolvedValue({ id: 4, name: "Tester", workspaceId: 1 });
        prisma.role.findUnique.mockResolvedValue(null);
        prisma.role.update.mockResolvedValue({ id: 4, name: "QA" });
        const res = mockRes();
        await updateRole(
            mockReq({ params: { workspaceId: "1", roleId: "4" }, body: { name: "QA" } }),
            res
        );
        expect(res.json).toHaveBeenCalled();
    });

    it("prevents modifying default roles", async () => {
        for (const name of ["Owner", "Admin", "Member"]) {
            prisma.role.findFirst.mockResolvedValue({ id: 1, name, workspaceId: 1 });
            const res = mockRes();
            await updateRole(
                mockReq({ params: { workspaceId: "1", roleId: "1" }, body: { name: "X" } }),
                res
            );
            expect(res.status).toHaveBeenCalledWith(400);
        }
    });

    it("returns 404 when role not found", async () => {
        prisma.role.findFirst.mockResolvedValue(null);
        const res = mockRes();
        await updateRole(
            mockReq({ params: { workspaceId: "1", roleId: "999" }, body: { name: "X" } }),
            res
        );
        expect(res.status).toHaveBeenCalledWith(404);
    });
});

describe("DELETE /workspaces/:workspaceId/roles/:roleId", () => {
    it("deletes a custom role with no members", async () => {
        prisma.role.findFirst.mockResolvedValue({ id: 4, name: "Tester", _count: { members: 0 } });
        prisma.role.delete.mockResolvedValue({});
        const res = mockRes();
        await deleteRole(mockReq({ params: { workspaceId: "1", roleId: "4" } }), res);
        expect(res.status).toHaveBeenCalledWith(204);
    });

    it("prevents deleting default roles", async () => {
        prisma.role.findFirst.mockResolvedValue({ id: 1, name: "Admin", _count: { members: 0 } });
        const res = mockRes();
        await deleteRole(mockReq({ params: { workspaceId: "1", roleId: "1" } }), res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("prevents deleting role with assigned members", async () => {
        prisma.role.findFirst.mockResolvedValue({ id: 4, name: "Tester", _count: { members: 2 } });
        const res = mockRes();
        await deleteRole(mockReq({ params: { workspaceId: "1", roleId: "4" } }), res);
        expect(res.status).toHaveBeenCalledWith(400);
    });
});
