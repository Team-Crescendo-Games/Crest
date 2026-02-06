import type { Request, Response } from "express";
import { PrismaClient } from '../../prisma/generated/prisma/client.js';
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

let prisma: PrismaClient;

function getPrismaClient() {
    if (!prisma) {
        const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
        const adapter = new PrismaPg(pool);
        prisma = new PrismaClient({ adapter });
    }
    return prisma;
}

export const getTasks = async (_req: Request, res: Response) => {
    const {projectId} = _req.query;

    try {
        const tasks = await getPrismaClient().task.findMany(
            {
                where: {
                    projectId: Number(projectId)
                },
                include: {
                    author: true,
                    assignee: true,
                    comments: true,
                    attachments: true,
                    taskTags: { include: { tag: true } },
                    subtasks: {
                        select: {
                            id: true,
                            title: true,
                            status: true,
                            priority: true,
                            assignee: { select: { userId: true, username: true, profilePictureUrl: true } },
                        },
                    },
                    parentTask: {
                        select: { id: true, title: true },
                    },
                }
            }
        );
        res.json(tasks);
    } catch (error: any) {
        console.error("Error fetching tasks:", error.message);
        res.status(500).json({ error: "Failed to fetch tasks: " + error.message });
    }
};

export const createTask = async (
    req: Request,
    res: Response
): Promise<void> => {
    const {
        title,
        description,
        status,
        priority,
        startDate,
        dueDate,
        points,
        projectId,
        authorUserId,
        assignedUserId,
        tagIds,
    } = req.body;
    try {
        const newTask = await getPrismaClient().task.create({
            data: {
                title,
                description,
                status,
                priority,
                startDate,
                dueDate,
                points,
                projectId,
                authorUserId,
                assignedUserId,
                ...(tagIds?.length && {
                    taskTags: {
                        create: tagIds.map((tagId: number) => ({ tagId })),
                    },
                }),
            },
            include: {
                taskTags: { include: { tag: true } },
            },
        });
        res.status(201).json(newTask);
    } catch (error: any) {
        res.status(500).json({ error: `Error creating a task: ${error.message}` });
    }
};

export const updateTaskStatus = async (
    req: Request,
    res: Response
): Promise<void> => {
    const { taskId } = req.params;
    const { status } = req.body;
    try {
        const updatedTask = await getPrismaClient().task.update({
            where: {
                id: Number(taskId),
            },
            data: {
                status: status,
            },
        });
        res.json(updatedTask);
    } catch (error: any) {
        res.status(500).json({ message: `Error updating task: ${error.message}` });
    }
};

export const updateTask = async (
    req: Request,
    res: Response
): Promise<void> => {
    const { taskId } = req.params;
    const { title, description, status, priority, startDate, dueDate, points, assignedUserId } = req.body;
    try {
        const data: Record<string, any> = {};
        if (title !== undefined) data.title = title;
        if (description !== undefined) data.description = description;
        if (status !== undefined) data.status = status || null;
        if (priority !== undefined) data.priority = priority || null;
        if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : null;
        if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
        if (points !== undefined) data.points = points !== null && points !== "" ? Number(points) : null;
        if (assignedUserId !== undefined) data.assignedUserId = assignedUserId ? Number(assignedUserId) : null;

        const updatedTask = await getPrismaClient().task.update({
            where: { id: Number(taskId) },
            data,
            include: {
                author: true,
                assignee: true,
                comments: true,
                attachments: true,
                taskTags: { include: { tag: true } },
                subtasks: {
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        priority: true,
                        assignee: { select: { userId: true, username: true, profilePictureUrl: true } },
                    },
                },
                parentTask: {
                    select: { id: true, title: true },
                },
            },
        });
        res.json(updatedTask);
    } catch (error: any) {
        res.status(500).json({ error: `Error updating task: ${error.message}` });
    }
};

export const getUserTasks = async (
    req: Request,
    res: Response
): Promise<void> => {
    const { userId } = req.params;
    try {
        const tasks = await getPrismaClient().task.findMany({
            where: {
                OR: [
                    { authorUserId: Number(userId) },
                    { assignedUserId: Number(userId) },
                ],
            },
            include: {
                author: true,
                assignee: true,
            },
        });
        res.json(tasks);
    } catch (error: any) {
        res.status(500).json({ error: `Error retrieving user's tasks: ${error.message}` });
    }
};
