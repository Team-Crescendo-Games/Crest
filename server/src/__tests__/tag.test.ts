import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockPrisma, mockReq, mockRes } from "./helpers.ts";

const prisma = createMockPrisma();
vi.mock("../lib/prisma.ts", () => ({ getPrismaClient: () => prisma }));

import { getTags, createTag, updateTag, deleteTag } from "../controllers/tagController.ts";

beforeEach(() => vi.clearAllMocks());

describe("GET /tags", () => {
    it("returns tags for workspace", async () => {
        const tags = [{ id: 1, name: "Bug", workspaceId: 1 }];
        prisma.tag.findMany.mockResolvedValue(tags);
        const res = mockRes();
        await getTags(mockReq({ query: { workspaceId: "1" } }), res);
        expect(res.json).toHaveBeenCalledWith(tags);
    });

    it("returns 400 without workspaceId", async () => {
        const res = mockRes();
        await getTags(mockReq(), res);
        expect(res.status).toHaveBeenCalledWith(400);
    });
});

describe("POST /tags", () => {
    it("creates a tag", async () => {
        const tag = { id: 1, name: "Feature", color: "#3b82f6", workspaceId: 1 };
        prisma.tag.create.mockResolvedValue(tag);
        const res = mockRes();
        await createTag(
            mockReq({ body: { name: "Feature", color: "#3b82f6", workspaceId: 1 } }),
            res
        );
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it("returns 400 without workspaceId", async () => {
        const res = mockRes();
        await createTag(mockReq({ body: { name: "Tag" } }), res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 409 on duplicate name", async () => {
        const err: any = new Error("dup");
        err.code = "P2002";
        prisma.tag.create.mockRejectedValue(err);
        const res = mockRes();
        await createTag(mockReq({ body: { name: "Bug", workspaceId: 1 } }), res);
        expect(res.status).toHaveBeenCalledWith(409);
    });
});

describe("PATCH /tags/:tagId", () => {
    it("updates a tag", async () => {
        const tag = { id: 1, name: "Updated" };
        prisma.tag.update.mockResolvedValue(tag);
        const res = mockRes();
        await updateTag(mockReq({ params: { tagId: "1" }, body: { name: "Updated" } }), res);
        expect(res.json).toHaveBeenCalledWith(tag);
    });

    it("returns 409 on duplicate name", async () => {
        const err: any = new Error("dup");
        err.code = "P2002";
        prisma.tag.update.mockRejectedValue(err);
        const res = mockRes();
        await updateTag(mockReq({ params: { tagId: "1" }, body: { name: "Bug" } }), res);
        expect(res.status).toHaveBeenCalledWith(409);
    });
});

describe("DELETE /tags/:tagId", () => {
    it("deletes a tag", async () => {
        prisma.tag.delete.mockResolvedValue({});
        const res = mockRes();
        await deleteTag(mockReq({ params: { tagId: "1" } }), res);
        expect(res.status).toHaveBeenCalledWith(204);
    });
});
