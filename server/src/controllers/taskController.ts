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

// Status mapping: 0=Input Queue, 1=Work In Progress, 2=Review, 3=Done
const statusIntToString = (status: number | null): string | null => {
    const statusMap: Record<number, string> = {
        0: "Input Queue",
        1: "Work In Progress",
        2: "Review",
        3: "Done",
    };
    return status !== null ? statusMap[status] || null : null;
};

const statusStringToInt = (status: string | null | undefined): number | null => {
    const statusMap: Record<string, number> = {
        "Input Queue": 0,
        "Work In Progress": 1,
        "Review": 2,
        "Done": 3,
    };
    return status ? statusMap[status] ?? null : null;
};

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
                    comments: {
                        include: {
                            user: true,
                        },
                    },
                    attachments: true,
                    taskTags: { include: { tag: true } },
                    subtasks: {
                        select: {
                            id: true,
                            title: true,
                            status: true,
                            priority: true,
                            assignee: { select: { userId: true, username: true, profilePictureExt: true } },
                        },
                    },
                    parentTask: {
                        select: { id: true, title: true },
                    },
                }
            }
        );
        
        // Map integer status to string for frontend
        const tasksWithStringStatus = tasks.map(task => ({
            ...task,
            status: statusIntToString(task.status),
            subtasks: task.subtasks?.map(subtask => ({
                ...subtask,
                status: statusIntToString(subtask.status),
            })),
        }));
        
        res.json(tasksWithStringStatus);
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
                status: statusStringToInt(status),
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
        
        // Map integer status to string for frontend
        const taskWithStringStatus = {
            ...newTask,
            status: statusIntToString(newTask.status),
        };
        
        res.status(201).json(taskWithStringStatus);
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
                status: statusStringToInt(status),
            },
        });
        
        // Map integer status to string for frontend
        const taskWithStringStatus = {
            ...updatedTask,
            status: statusIntToString(updatedTask.status),
        };
        
        res.json(taskWithStringStatus);
    } catch (error: any) {
        res.status(500).json({ message: `Error updating task: ${error.message}` });
    }
};

export const updateTask = async (
    req: Request,
    res: Response
): Promise<void> => {
    const { taskId } = req.params;
    const { title, description, status, priority, startDate, dueDate, points, assignedUserId, tagIds, subtaskIds } = req.body;
    try {
        const data: Record<string, any> = {};
        if (title !== undefined) data.title = title;
        if (description !== undefined) data.description = description;
        if (status !== undefined) data.status = statusStringToInt(status);
        if (priority !== undefined) data.priority = priority || null;
        if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : null;
        if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
        if (points !== undefined) data.points = points !== null && points !== "" ? Number(points) : null;
        if (assignedUserId !== undefined) data.assignedUserId = assignedUserId ? Number(assignedUserId) : null;

        // Handle tag updates: delete existing and create new associations
        if (tagIds !== undefined) {
            await getPrismaClient().taskTag.deleteMany({
                where: { taskId: Number(taskId) },
            });
            if (tagIds.length > 0) {
                await getPrismaClient().taskTag.createMany({
                    data: tagIds.map((tagId: number) => ({
                        taskId: Number(taskId),
                        tagId,
                    })),
                });
            }
        }

        // Handle subtask updates: set parentTaskId for new subtasks, clear for removed ones
        if (subtaskIds !== undefined) {
            const currentTask = await getPrismaClient().task.findUnique({
                where: { id: Number(taskId) },
                include: { subtasks: { select: { id: true } } },
            });
            
            const currentSubtaskIds = currentTask?.subtasks.map(s => s.id) || [];
            const newSubtaskIds = subtaskIds as number[];
            
            // Tasks to add as subtasks (set parentTaskId)
            const toAdd = newSubtaskIds.filter(id => !currentSubtaskIds.includes(id));
            if (toAdd.length > 0) {
                await getPrismaClient().task.updateMany({
                    where: { id: { in: toAdd } },
                    data: { parentTaskId: Number(taskId) },
                });
            }
            
            // Tasks to remove as subtasks (clear parentTaskId)
            const toRemove = currentSubtaskIds.filter(id => !newSubtaskIds.includes(id));
            if (toRemove.length > 0) {
                await getPrismaClient().task.updateMany({
                    where: { id: { in: toRemove } },
                    data: { parentTaskId: null },
                });
            }
        }

        const updatedTask = await getPrismaClient().task.update({
            where: { id: Number(taskId) },
            data,
            include: {
                author: true,
                assignee: true,
                comments: {
                    include: {
                        user: true,
                    },
                },
                attachments: true,
                taskTags: { include: { tag: true } },
                subtasks: {
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        priority: true,
                        assignee: { select: { userId: true, username: true, profilePictureExt: true } },
                    },
                },
                parentTask: {
                    select: { id: true, title: true },
                },
            },
        });
        
        // Map integer status to string for frontend
        const taskWithStringStatus = {
            ...updatedTask,
            status: statusIntToString(updatedTask.status),
            subtasks: updatedTask.subtasks?.map(subtask => ({
                ...subtask,
                status: statusIntToString(subtask.status),
            })),
        };
        
        res.json(taskWithStringStatus);
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
        
        // Map integer status to string for frontend
        const tasksWithStringStatus = tasks.map(task => ({
            ...task,
            status: statusIntToString(task.status),
        }));
        
        res.json(tasksWithStringStatus);
    } catch (error: any) {
        res.status(500).json({ error: `Error retrieving user's tasks: ${error.message}` });
    }
};

export const deleteTask = async (
    req: Request,
    res: Response
): Promise<void> => {
    const { taskId } = req.params;
    try {
        await getPrismaClient().task.delete({
            where: {
                id: Number(taskId),
            },
        });
        res.json({ message: "Task deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ error: `Error deleting task: ${error.message}` });
    }
};
