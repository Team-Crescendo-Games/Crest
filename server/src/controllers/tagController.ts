import type { Request, Response } from "express";
import { getPrismaClient } from "../lib/prisma.ts";

export const getTags = async (req: Request, res: Response) => {
    try {
        const { workspaceId } = req.query;

        if (!workspaceId) {
            res.status(400).json({ error: "workspaceId is required to fetch tags" });
            return;
        }

        const tags = await getPrismaClient().tag.findMany({
            where: { workspaceId: Number(workspaceId) },
            orderBy: { name: "asc" },
        });
        res.json(tags);
    } catch (error: any) {
        res.status(500).json({ error: "Failed to fetch tags: " + error.message });
    }
};

export const createTag = async (req: Request, res: Response) => {
    try {
        const { name, color, workspaceId } = req.body;

        if (!workspaceId) {
            res.status(400).json({ error: "workspaceId is required to create a tag" });
            return;
        }

        const tag = await getPrismaClient().tag.create({
            data: {
                name,
                color,
                workspaceId: Number(workspaceId),
            },
        });
        res.status(201).json(tag);
    } catch (error: any) {
        if (error.code === "P2002") {
            res.status(409).json({
                error: "A tag with this name already exists in this workspace.",
            });
            return;
        }
        res.status(500).json({ error: "Failed to create tag: " + error.message });
    }
};

export const updateTag = async (req: Request, res: Response) => {
    try {
        const { tagId } = req.params;
        const { name, color } = req.body;
        const data: Record<string, any> = {};

        if (name !== undefined) data.name = name;
        if (color !== undefined) data.color = color;

        const tag = await getPrismaClient().tag.update({
            where: { id: Number(tagId) },
            data,
        });
        res.json(tag);
    } catch (error: any) {
        if (error.code === "P2002") {
            res.status(409).json({
                error: "A tag with this name already exists in this workspace.",
            });
            return;
        }
        res.status(500).json({ error: "Failed to update tag: " + error.message });
    }
};

export const deleteTag = async (req: Request, res: Response) => {
    try {
        const { tagId } = req.params;
        await getPrismaClient().tag.delete({ where: { id: Number(tagId) } });
        res.status(204).send();
    } catch (error: any) {
        res.status(500).json({ error: "Failed to delete tag: " + error.message });
    }
};
