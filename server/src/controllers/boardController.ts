import type { Request, Response } from "express";
import { getPrismaClient } from "../lib/prisma.ts";

export const getBoards = async (req: Request, res: Response) => {
    try {
        const { workspaceId } = req.query;

        if (!workspaceId) {
            res.status(400).json({ error: "workspaceId is required" });
            return;
        }

        const boards = await getPrismaClient().board.findMany({
            where: { workspaceId: Number(workspaceId) },
            orderBy: { displayOrder: "asc" },
        });
        res.json(boards);
    } catch (error: any) {
        console.error("Error fetching boards:", error.message);
        res.status(500).json({ error: "Failed to fetch boards: " + error.message });
    }
};

export const createBoard = async (req: Request, res: Response) => {
    try {
        const { name, description, workspaceId } = req.body;

        if (!workspaceId) {
            res.status(400).json({ error: "workspaceId is required to create a board" });
            return;
        }

        const board = await getPrismaClient().board.create({
            data: {
                name,
                description,
                workspaceId: Number(workspaceId),
            },
        });
        res.status(201).json(board);
    } catch (error: any) {
        console.error("Error creating board:", error.message);
        res.status(500).json({ error: "Failed to create board: " + error.message });
    }
};

export const updateBoard = async (req: Request, res: Response) => {
    try {
        const { boardId } = req.params;
        const { name, description } = req.body;
        const board = await getPrismaClient().board.update({
            where: { id: Number(boardId) },
            data: { name, description },
        });
        res.json(board);
    } catch (error: any) {
        console.error("Error updating board:", error.message);
        res.status(500).json({ error: "Failed to update board: " + error.message });
    }
};

export const deleteBoard = async (req: Request, res: Response) => {
    try {
        const { boardId } = req.params;
        await getPrismaClient().board.delete({
            where: { id: Number(boardId) },
        });
        res.status(204).send();
    } catch (error: any) {
        console.error("Error deleting board:", error.message);
        res.status(500).json({ error: "Failed to delete board: " + error.message });
    }
};

/**
 * Archive/unarchive a board (toggle isActive)
 * PATCH /boards/:boardId/archive
 */
export const archiveBoard = async (req: Request, res: Response) => {
    try {
        const { boardId } = req.params;
        const id = Number(boardId);

        if (isNaN(id)) {
            res.status(400).json({ error: "Invalid board ID" });
            return;
        }

        const existingBoard = await getPrismaClient().board.findUnique({
            where: { id },
        });

        if (!existingBoard) {
            res.status(404).json({ error: "Board not found" });
            return;
        }

        const board = await getPrismaClient().board.update({
            where: { id },
            data: { isActive: !existingBoard.isActive },
        });

        res.json(board);
    } catch (error: any) {
        console.error("Error archiving board:", error.message);
        res.status(500).json({ error: "Failed to archive board: " + error.message });
    }
};

/**
 * Reorder boards
 * PATCH /boards/reorder
 */
export const reorderBoards = async (req: Request, res: Response) => {
    try {
        const { orderedIds, workspaceId } = req.body;

        if (!Array.isArray(orderedIds)) {
            res.status(400).json({ error: "orderedIds must be an array" });
            return;
        }

        if (!workspaceId) {
            res.status(400).json({ error: "workspaceId is required to reorder boards" });
            return;
        }

        // Update each board's displayOrder based on its position in the array
        await getPrismaClient().$transaction(
            orderedIds.map((id: number, index: number) =>
                getPrismaClient().board.update({
                    where: { id },
                    data: { displayOrder: index },
                })
            )
        );

        // Fetch and return the newly ordered list, scoped to the workspace
        const boards = await getPrismaClient().board.findMany({
            where: { workspaceId: Number(workspaceId) },
            orderBy: { displayOrder: "asc" },
        });

        res.json(boards);
    } catch (error: any) {
        console.error("Error reordering boards:", error.message);
        res.status(500).json({ error: "Failed to reorder boards: " + error.message });
    }
};
