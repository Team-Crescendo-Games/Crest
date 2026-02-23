import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockPrisma, mockReq, mockRes } from "./helpers.ts";

const prisma = createMockPrisma();
vi.mock("../lib/prisma.ts", () => ({ getPrismaClient: () => prisma }));

import {
    getUsers,
    getUser,
    getUserById,
    postUser,
    updateUserProfilePicture,
    updateUserProfile,
} from "../controllers/userController.ts";

beforeEach(() => vi.clearAllMocks());

describe("GET /users (getUsers)", () => {
    it("returns all users", async () => {
        const users = [{ userId: 1, username: "alice" }];
        prisma.user.findMany.mockResolvedValue(users);
        const res = mockRes();
        await getUsers(mockReq(), res);
        expect(res.json).toHaveBeenCalledWith(users);
    });

    it("returns 500 on error", async () => {
        prisma.user.findMany.mockRejectedValue(new Error("db down"));
        const res = mockRes();
        await getUsers(mockReq(), res);
        expect(res.status).toHaveBeenCalledWith(500);
    });
});

describe("GET /users/:cognitoId (getUser)", () => {
    it("returns user by cognitoId", async () => {
        const user = { userId: 1, cognitoId: "abc-123", username: "alice" };
        prisma.user.findUnique.mockResolvedValue(user);
        const res = mockRes();
        await getUser(mockReq({ params: { cognitoId: "abc-123" } }), res);
        expect(res.json).toHaveBeenCalledWith(user);
    });

    it("returns 404 when user not found (non-dev)", async () => {
        prisma.user.findUnique.mockResolvedValue(null);
        const res = mockRes();
        await getUser(mockReq({ params: { cognitoId: "missing" } }), res);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 400 for missing cognitoId", async () => {
        const res = mockRes();
        await getUser(mockReq({ params: {} }), res);
        expect(res.status).toHaveBeenCalledWith(400);
    });
});

describe("GET /users/id/:userId (getUserById)", () => {
    it("returns user by id", async () => {
        const user = { userId: 5, username: "bob" };
        prisma.user.findUnique.mockResolvedValue(user);
        const res = mockRes();
        await getUserById(mockReq({ params: { userId: "5" } }), res);
        expect(res.json).toHaveBeenCalledWith(user);
    });

    it("returns 400 for non-numeric id", async () => {
        const res = mockRes();
        await getUserById(mockReq({ params: { userId: "abc" } }), res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 when not found", async () => {
        prisma.user.findUnique.mockResolvedValue(null);
        const res = mockRes();
        await getUserById(mockReq({ params: { userId: "999" } }), res);
        expect(res.status).toHaveBeenCalledWith(404);
    });
});

describe("POST /users (postUser)", () => {
    it("creates a new user", async () => {
        prisma.user.findFirst.mockResolvedValue(null);
        const newUser = { userId: 1, username: "alice", cognitoId: "cog-1" };
        prisma.user.create.mockResolvedValue(newUser);
        const res = mockRes();
        await postUser(mockReq({ body: { username: "alice", cognitoId: "cog-1" } }), res);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ newUser }));
    });

    it("returns 400 when username missing", async () => {
        const res = mockRes();
        await postUser(mockReq({ body: { cognitoId: "cog-1" } }), res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 409 on duplicate", async () => {
        prisma.user.findFirst.mockResolvedValue({ userId: 1, cognitoId: "cog-1" });
        const res = mockRes();
        await postUser(mockReq({ body: { username: "alice", cognitoId: "cog-1" } }), res);
        expect(res.status).toHaveBeenCalledWith(409);
    });
});

describe("PATCH /users/:cognitoId/profile-picture", () => {
    it("updates profile picture", async () => {
        const user = { userId: 1, profilePictureExt: "png" };
        prisma.user.update.mockResolvedValue(user);
        const res = mockRes();
        await updateUserProfilePicture(
            mockReq({ params: { cognitoId: "abc" }, body: { profilePictureExt: "png" } }),
            res
        );
        expect(res.json).toHaveBeenCalledWith(user);
    });

    it("returns 400 for missing ext", async () => {
        const res = mockRes();
        await updateUserProfilePicture(mockReq({ params: { cognitoId: "abc" }, body: {} }), res);
        expect(res.status).toHaveBeenCalledWith(400);
    });
});

describe("PATCH /users/:cognitoId/profile", () => {
    it("updates fullName", async () => {
        const user = { userId: 1, fullName: "Alice B" };
        prisma.user.update.mockResolvedValue(user);
        const res = mockRes();
        await updateUserProfile(
            mockReq({ params: { cognitoId: "abc" }, body: { fullName: "Alice B" } }),
            res
        );
        expect(res.json).toHaveBeenCalledWith(user);
    });

    it("returns 400 when no fields provided", async () => {
        const res = mockRes();
        await updateUserProfile(mockReq({ params: { cognitoId: "abc" }, body: {} }), res);
        expect(res.status).toHaveBeenCalledWith(400);
    });
});
