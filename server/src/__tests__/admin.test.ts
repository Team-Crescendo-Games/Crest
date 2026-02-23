import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockPrisma, mockReq, mockRes } from "./helpers.ts";

const prisma = createMockPrisma();
vi.mock("../lib/prisma.ts", () => ({ getPrismaClient: () => prisma }));

import { adminUpdateUser, adminDeleteUser } from "../controllers/adminController.ts";

beforeEach(() => vi.clearAllMocks());

describe("PATCH /admin/users/:userId", () => {
    it("updates a user", async () => {
        const user = { userId: 1, username: "updated" };
        prisma.user.update.mockResolvedValue(user);
        const res = mockRes();
        await adminUpdateUser(
            mockReq({ params: { userId: "1" }, body: { username: "updated" } }),
            res
        );
        expect(res.json).toHaveBeenCalledWith(user);
    });

    it("returns 400 for invalid userId", async () => {
        const res = mockRes();
        await adminUpdateUser(mockReq({ params: { userId: "abc" }, body: { username: "x" } }), res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 when no fields provided", async () => {
        const res = mockRes();
        await adminUpdateUser(mockReq({ params: { userId: "1" }, body: {} }), res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 on duplicate username", async () => {
        const err: any = new Error("dup");
        err.code = "P2002";
        prisma.user.update.mockRejectedValue(err);
        const res = mockRes();
        await adminUpdateUser(
            mockReq({ params: { userId: "1" }, body: { username: "taken" } }),
            res
        );
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 when user not found", async () => {
        const err: any = new Error("not found");
        err.code = "P2025";
        prisma.user.update.mockRejectedValue(err);
        const res = mockRes();
        await adminUpdateUser(mockReq({ params: { userId: "999" }, body: { username: "x" } }), res);
        expect(res.status).toHaveBeenCalledWith(404);
    });
});

describe("DELETE /admin/users/:userId", () => {
    it("deletes a user", async () => {
        prisma.user.delete.mockResolvedValue({});
        const res = mockRes();
        await adminDeleteUser(mockReq({ params: { userId: "1" } }), res);
        expect(res.status).toHaveBeenCalledWith(204);
    });

    it("returns 400 for invalid userId", async () => {
        const res = mockRes();
        await adminDeleteUser(mockReq({ params: { userId: "abc" } }), res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 when user not found", async () => {
        const err: any = new Error("not found");
        err.code = "P2025";
        prisma.user.delete.mockRejectedValue(err);
        const res = mockRes();
        await adminDeleteUser(mockReq({ params: { userId: "999" } }), res);
        expect(res.status).toHaveBeenCalledWith(404);
    });
});
