import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockPrisma, mockReq, mockRes } from "./helpers.ts";

const prisma = createMockPrisma();
vi.mock("../lib/prisma.ts", () => ({ getPrismaClient: () => prisma }));
vi.mock("@aws-sdk/client-s3", () => ({
    S3Client: vi.fn().mockImplementation(() => ({ send: vi.fn() })),
    DeleteObjectCommand: vi.fn(),
}));

import { createAttachment, deleteAttachment } from "../controllers/attachmentController.ts";

beforeEach(() => vi.clearAllMocks());

describe("POST /attachments", () => {
    it("creates an attachment", async () => {
        const attachment = { id: 1, taskId: 1, uploadedById: 1, fileExt: "pdf" };
        prisma.attachment.create.mockResolvedValue(attachment);
        const res = mockRes();
        await createAttachment(
            mockReq({ body: { taskId: 1, uploadedById: 1, fileExt: "pdf" } }),
            res
        );
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(attachment);
    });

    it("returns 400 for missing fields", async () => {
        const res = mockRes();
        await createAttachment(mockReq({ body: { taskId: 1 } }), res);
        expect(res.status).toHaveBeenCalledWith(400);
    });
});

describe("DELETE /attachments/:attachmentId", () => {
    it("deletes an attachment", async () => {
        prisma.attachment.findUnique.mockResolvedValue({ id: 1, taskId: 1, fileExt: "pdf" });
        prisma.attachment.delete.mockResolvedValue({});
        const res = mockRes();
        await deleteAttachment(mockReq({ params: { attachmentId: "1" } }), res);
        expect(res.json).toHaveBeenCalled();
    });

    it("returns 404 when not found", async () => {
        prisma.attachment.findUnique.mockResolvedValue(null);
        const res = mockRes();
        await deleteAttachment(mockReq({ params: { attachmentId: "999" } }), res);
        expect(res.status).toHaveBeenCalledWith(404);
    });
});
