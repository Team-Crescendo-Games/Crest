import type { Request, Response } from "express";
import { getPrismaClient } from "../lib/prisma.ts";

export const getTags = async (_req: Request, res: Response) => {
  try {
    const tags = await getPrismaClient().tag.findMany({
      orderBy: { name: "asc" },
    });
    res.json(tags);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch tags: " + error.message });
  }
};

export const createTag = async (req: Request, res: Response) => {
  try {
    const { name, color } = req.body;
    const tag = await getPrismaClient().tag.create({ data: { name, color } });
    res.status(201).json(tag);
  } catch (error: any) {
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
