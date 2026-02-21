import type { Request, Response } from "express";
import { getPrismaClient } from "../lib/prisma.ts";
import { statusIntToString } from "../lib/statusUtils.ts";

export const search = async (req: Request, res: Response): Promise<void> => {
    const { query, categories, workspaceId } = req.query;

    if (!workspaceId) {
        res.status(400).json({ error: "workspaceId is required for searching" });
        return;
    }

    // Parse categories - default to all if not specified 
    const categoryList = categories
        ? (categories as string).split(",")
        : ["tasks", "boards", "users", "sprints"];

    try {
        const results: {
            tasks?: any[];
            boards?: any[]; 
            users?: any[];
            sprints?: any[];
        } = {};

        if (categoryList.includes("tasks")) {
            const tasks = await getPrismaClient().task.findMany({
                where: {
                    board: {
                        workspaceId: Number(workspaceId),
                    },
                    OR: [
                        { title: { contains: query as string, mode: "insensitive" } },
                        { description: { contains: query as string, mode: "insensitive" } },
                    ],
                },
                include: {
                    author: true,
                    comments: true,
                    attachments: true,
                    taskTags: {
                        include: {
                            tag: true,
                        },
                    },
                    taskAssignments: {
                        include: {
                            user: {
                                select: {
                                    userId: true,
                                    username: true,
                                    profilePictureExt: true,
                                },
                            },
                        },
                    },
                },
            });
            // Map integer status to string for frontend
            results.tasks = tasks.map((task) => ({
                ...task,
                status: statusIntToString(task.status),
            }));
        }

        if (categoryList.includes("boards")) {
            results.boards = await getPrismaClient().board.findMany({
                where: {
                    workspaceId: Number(workspaceId), 
                    OR: [
                        { name: { contains: query as string, mode: "insensitive" } },
                        { description: { contains: query as string, mode: "insensitive" } },
                    ],
                },
            });
        }

        if (categoryList.includes("users")) {
            results.users = await getPrismaClient().user.findMany({
                where: {
                    workspaceMembers: {
                        some: {
                            workspaceId: Number(workspaceId),
                        },
                    },
                    OR: [
                        { username: { contains: query as string, mode: "insensitive" } },
                        { fullName: { contains: query as string, mode: "insensitive" } },
                        { email: { contains: query as string, mode: "insensitive" } },
                    ],
                },
            });
        }

        if (categoryList.includes("sprints")) {
            results.sprints = await getPrismaClient().sprint.findMany({
                where: {
                    workspaceId: Number(workspaceId),
                    title: { contains: query as string, mode: "insensitive" },
                },
                include: {
                    _count: {
                        select: { sprintTasks: true },
                    },
                },
            });
        }

        res.json(results);
    } catch (error: any) {
        res.status(500).json({ message: `Error performing search: ${error.message}` });
    }
};
