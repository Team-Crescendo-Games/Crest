import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockPrisma, mockReq, mockRes } from "./helpers.ts";

const prisma = createMockPrisma();
vi.mock("../lib/prisma.ts", () => ({ getPrismaClient: () => prisma }));

import {
    createInvitation,
    getInvitations,
    deleteInvitation,
    joinByInvitation,
} from "../controllers/invitationController.ts";

beforeEach(() => vi.clearAllMocks());

describe("POST /workspaces/:workspaceId/invitations", () => {
    it("creates an invitation", async () => {
        prisma.workspaceInvitation.create.mockResolvedValue({ id: "uuid-1", workspaceId: 1 });
        const res = mockRes();
        await createInvitation(mockReq({ params: { workspaceId: "1" }, body: { userId: 1 } }), res);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it("returns 400 without userId", async () => {
        const res = mockRes();
        await createInvitation(mockReq({ params: { workspaceId: "1" }, body: {} }), res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 for invalid expiresInDays", async () => {
        const res = mockRes();
        await createInvitation(
            mockReq({ params: { workspaceId: "1" }, body: { userId: 1, expiresInDays: 100 } }),
            res
        );
        expect(res.status).toHaveBeenCalledWith(400);
    });
});

describe("GET /workspaces/:workspaceId/invitations", () => {
    it("returns invitations", async () => {
        prisma.workspaceInvitation.findMany.mockResolvedValue([{ id: "uuid-1" }]);
        const res = mockRes();
        await getInvitations(mockReq({ params: { workspaceId: "1" } }), res);
        expect(res.json).toHaveBeenCalled();
    });
});

describe("DELETE /workspaces/:workspaceId/invitations/:invitationId", () => {
    it("deletes an invitation", async () => {
        prisma.workspaceInvitation.delete.mockResolvedValue({});
        const res = mockRes();
        await deleteInvitation(mockReq({ params: { invitationId: "uuid-1" } }), res);
        expect(res.status).toHaveBeenCalledWith(204);
    });
});

describe("POST /invitations/:invitationId/join", () => {
    it("joins workspace via invitation", async () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7);
        prisma.workspaceInvitation.findUnique.mockResolvedValue({
            id: "uuid-1",
            workspaceId: 1,
            expiresAt: futureDate,
            workspace: { id: 1, name: "WS" },
        });
        prisma.workspaceMember.findUnique.mockResolvedValue(null);
        prisma.role.findFirst.mockResolvedValue({ id: 3, name: "Member" });
        prisma.workspaceMember.create.mockResolvedValue({
            workspaceId: 1,
            userId: 2,
            workspace: { name: "WS" },
        });
        const res = mockRes();
        await joinByInvitation(
            mockReq({ params: { invitationId: "uuid-1" }, body: { userId: 2 } }),
            res
        );
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it("returns 404 for missing invitation", async () => {
        prisma.workspaceInvitation.findUnique.mockResolvedValue(null);
        const res = mockRes();
        await joinByInvitation(
            mockReq({ params: { invitationId: "missing" }, body: { userId: 2 } }),
            res
        );
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 410 for expired invitation", async () => {
        const pastDate = new Date("2020-01-01");
        prisma.workspaceInvitation.findUnique.mockResolvedValue({
            id: "uuid-1",
            workspaceId: 1,
            expiresAt: pastDate,
        });
        const res = mockRes();
        await joinByInvitation(
            mockReq({ params: { invitationId: "uuid-1" }, body: { userId: 2 } }),
            res
        );
        expect(res.status).toHaveBeenCalledWith(410);
    });

    it("returns 400 if already a member", async () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7);
        prisma.workspaceInvitation.findUnique.mockResolvedValue({
            id: "uuid-1",
            workspaceId: 1,
            expiresAt: futureDate,
        });
        prisma.workspaceMember.findUnique.mockResolvedValue({ userId: 2 });
        const res = mockRes();
        await joinByInvitation(
            mockReq({ params: { invitationId: "uuid-1" }, body: { userId: 2 } }),
            res
        );
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 without userId", async () => {
        const res = mockRes();
        await joinByInvitation(mockReq({ params: { invitationId: "uuid-1" }, body: {} }), res);
        expect(res.status).toHaveBeenCalledWith(400);
    });
});
