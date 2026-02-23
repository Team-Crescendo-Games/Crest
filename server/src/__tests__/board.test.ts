import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockPrisma, mockReq, mockRes } from "./helpers.ts";

const prisma = createMockPrisma();
vi.mock("../lib/prisma.ts", () => ({ getPrismaClient: () => prisma }));

import {
    getBoards,
    createBoard,
    updateBoard,
    deleteBoard,
    archiveBoard,
    reorderBoards,
} from "../controllers/boardController.ts";

beforeEach(() => vi.clearAllMocks());

describe("GET /boards", () => {
    it("returns boards for workspace", async () => {
        const boards = [{ id: 1, name: "Board 1", workspaceId: 1 }];
        prisma.board.findMany.mockResolvedValue(boards);
        const res = mockRes();
        await getBoards(mockReq({ query: { workspaceId: "1" } }), res);
        expect(res.json).toHaveBeenCalledWith(boards);
    });

    it("returns 400 without workspaceId", async () => {
        const res = mockRes();
        await getBoards(mockReq(), res);
        expect(res.status).toHaveBeenCalledWith(400);
    });
});

describe("POST /boards", () => {
    it("creates a board", async () => {
        const board = { id: 1, name: "New Board", workspaceId: 1 };
        prisma.board.create.mockResolvedValue(board);
        const res = mockRes();
        await createBoard(mockReq({ body: { name: "New Board", workspaceId: 1 } }), res);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(board);
    });

    it("returns 400 without workspaceId", async () => {
        const res = mockRes();
        await createBoard(mockReq({ body: { name: "Board" } }), res);
        expect(res.status).toHaveBeenCalledWith(400);
    });
});

describe("PATCH /boards/:boardId", () => {
    it("updates a board", async () => {
        const board = { id: 1, name: "Updated" };
        prisma.board.update.mockResolvedValue(board);
        const res = mockRes();
        await updateBoard(mockReq({ params: { boardId: "1" }, body: { name: "Updated" } }), res);
        expect(res.json).toHaveBeenCalledWith(board);
    });
});

describe("DELETE /boards/:boardId", () => {
    it("deletes a board", async () => {
        prisma.board.delete.mockResolvedValue({});
        const res = mockRes();
        await deleteBoard(mockReq({ params: { boardId: "1" } }), res);
        expect(res.status).toHaveBeenCalledWith(204);
    });
});

describe("PATCH /boards/:boardId/archive", () => {
    it("toggles isActive", async () => {
        prisma.board.findUnique.mockResolvedValue({ id: 1, isActive: true });
        prisma.board.update.mockResolvedValue({ id: 1, isActive: false });
        const res = mockRes();
        await archiveBoard(mockReq({ params: { boardId: "1" } }), res);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }));
    });

    it("returns 404 when board not found", async () => {
        prisma.board.findUnique.mockResolvedValue(null);
        const res = mockRes();
        await archiveBoard(mockReq({ params: { boardId: "999" } }), res);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 400 for invalid id", async () => {
        const res = mockRes();
        await archiveBoard(mockReq({ params: { boardId: "abc" } }), res);
        expect(res.status).toHaveBeenCalledWith(400);
    });
});

describe("PATCH /boards/reorder", () => {
    it("reorders boards", async () => {
        prisma.board.update.mockResolvedValue({});
        const boards = [
            { id: 2, displayOrder: 0 },
            { id: 1, displayOrder: 1 },
        ];
        prisma.board.findMany.mockResolvedValue(boards);
        const res = mockRes();
        await reorderBoards(mockReq({ body: { orderedIds: [2, 1], workspaceId: 1 } }), res);
        expect(res.json).toHaveBeenCalledWith(boards);
    });

    it("returns 400 without orderedIds array", async () => {
        const res = mockRes();
        await reorderBoards(mockReq({ body: { orderedIds: "not-array", workspaceId: 1 } }), res);
        expect(res.status).toHaveBeenCalledWith(400);
    });
});
