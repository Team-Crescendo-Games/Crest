import type { Request, Response } from "express";
import { PrismaClient } from '../../prisma/generated/prisma/client.js';
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { createActivity, ActivityType } from "./activityController.ts";

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

// Common include object for task queries
const taskInclude = {
    author: true,
    assignee: true,
    comments: {
        orderBy: [{ createdAt: 'asc' as const }, { id: 'asc' as const }],
        include: {
            user: true,
            reactions: {
                include: {
                    user: {
                        select: { userId: true, username: true },
                    },
                },
            },
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
    sprintTasks: {
        include: {
            sprint: {
                select: { id: true, title: true },
            },
        },
    },
    activities: {
        include: {
            user: {
                select: { userId: true, username: true },
            },
        },
        orderBy: {
            createdAt: 'desc' as const,
        },
    },
};

// Helper to transform task for frontend
const transformTask = (task: any) => ({
    ...task,
    status: statusIntToString(task.status),
    subtasks: task.subtasks?.map((subtask: any) => ({
        ...subtask,
        status: statusIntToString(subtask.status),
    })),
    sprints: task.sprintTasks?.map((st: any) => st.sprint),
});

export const getTasks = async (_req: Request, res: Response) => {
    const {projectId} = _req.query;

    try {
        const tasks = await getPrismaClient().task.findMany(
            {
                where: {
                    projectId: Number(projectId)
                },
                include: taskInclude,
            }
        );
        
        const tasksWithStringStatus = tasks.map(transformTask);
        res.json(tasksWithStringStatus);
    } catch (error: any) {
        console.error("Error fetching tasks:", error.message);
        res.status(500).json({ error: "Failed to fetch tasks: " + error.message });
    }
};

export const getTaskById = async (req: Request, res: Response) => {
    const { taskId } = req.params;

    try {
        const task = await getPrismaClient().task.findUnique({
            where: { id: Number(taskId) },
            include: taskInclude,
        });

        if (!task) {
            res.status(404).json({ error: "Task not found" });
            return;
        }

        res.json(transformTask(task));
    } catch (error: any) {
        console.error("Error fetching task:", error.message);
        res.status(500).json({ error: "Failed to fetch task: " + error.message });
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
        sprintIds,
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
                ...(sprintIds?.length && {
                    sprintTasks: {
                        create: sprintIds.map((sprintId: number) => ({ sprintId })),
                    },
                }),
            },
            include: {
                taskTags: { include: { tag: true } },
                sprintTasks: {
                    include: {
                        sprint: {
                            select: { id: true, title: true },
                        },
                    },
                },
            },
        });
        
        // Create a Create Task activity (Requirement 2.1)
        try {
            await createActivity({
                taskId: newTask.id,
                userId: authorUserId,
                activityType: ActivityType.CREATE_TASK,
            });
        } catch (activityError: any) {
            console.error("Error creating activity for new task:", activityError.message);
        }
        
        const taskWithStringStatus = {
            ...newTask,
            status: statusIntToString(newTask.status),
            sprints: newTask.sprintTasks?.map(st => st.sprint),
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
    const { status, userId } = req.body;
    try {
        const currentTask = await getPrismaClient().task.findUnique({
            where: { id: Number(taskId) },
            select: { status: true },
        });
        
        const previousStatus = currentTask ? statusIntToString(currentTask.status) : null;
        
        const updatedTask = await getPrismaClient().task.update({
            where: {
                id: Number(taskId),
            },
            data: {
                status: statusStringToInt(status),
            },
        });
        
        if (previousStatus && previousStatus !== status && userId) {
            try {
                await createActivity({
                    taskId: Number(taskId),
                    userId: userId,
                    activityType: ActivityType.MOVE_TASK,
                    previousStatus: previousStatus,
                    newStatus: status,
                });
            } catch (activityError: any) {
                console.error("Error creating activity for status update:", activityError.message);
            }
        }
        
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
    const { title, description, status, priority, startDate, dueDate, points, assignedUserId, tagIds, subtaskIds, projectId, sprintIds, userId } = req.body;
    try {
        const currentTask = await getPrismaClient().task.findUnique({
            where: { id: Number(taskId) },
            include: {
                assignee: { select: { username: true } },
                taskTags: { include: { tag: true } },
            },
        });
        
        const data: Record<string, any> = {};
        const editActivities: string[] = [];
        
        if (title !== undefined) {
            data.title = title;
            if (currentTask && currentTask.title !== title) {
                editActivities.push("updated the title");
            }
        }
        if (description !== undefined) {
            data.description = description;
            if (currentTask && currentTask.description !== description) {
                editActivities.push("updated the description");
            }
        }
        if (status !== undefined) {
            data.status = statusStringToInt(status);
            const currentStatusString = statusIntToString(currentTask?.status ?? null);
            if (currentTask && currentStatusString !== status) {
                editActivities.push(`changed the status to ${status}`);
            }
        }
        if (priority !== undefined) {
            data.priority = priority || null;
            if (currentTask && currentTask.priority !== (priority || null)) {
                if (priority) {
                    editActivities.push(`changed the priority to ${priority}`);
                } else {
                    editActivities.push("removed the priority");
                }
            }
        }
        if (startDate !== undefined) {
            data.startDate = startDate ? new Date(startDate) : null;
            const currentStartDate = currentTask?.startDate?.toISOString().split('T')[0] || null;
            const newStartDate = startDate ? new Date(startDate).toISOString().split('T')[0] : null;
            if (currentStartDate !== newStartDate) {
                if (startDate) {
                    editActivities.push("set the start date");
                } else {
                    editActivities.push("removed the start date");
                }
            }
        }
        if (dueDate !== undefined) {
            data.dueDate = dueDate ? new Date(dueDate) : null;
            const currentDueDate = currentTask?.dueDate?.toISOString().split('T')[0] || null;
            const newDueDate = dueDate ? new Date(dueDate).toISOString().split('T')[0] : null;
            if (currentDueDate !== newDueDate) {
                if (dueDate) {
                    editActivities.push("set the due date");
                } else {
                    editActivities.push("removed the due date");
                }
            }
        }
        if (points !== undefined) {
            data.points = points !== null && points !== "" ? Number(points) : null;
            const currentPoints = currentTask?.points ?? null;
            const newPoints = points !== null && points !== "" ? Number(points) : null;
            if (currentPoints !== newPoints) {
                if (newPoints !== null) {
                    editActivities.push(`updated the points to ${newPoints}`);
                } else {
                    editActivities.push("removed the points");
                }
            }
        }
        if (assignedUserId !== undefined) {
            data.assignedUserId = assignedUserId ? Number(assignedUserId) : null;
            const currentAssigneeId = currentTask?.assignedUserId ?? null;
            const newAssigneeId = assignedUserId ? Number(assignedUserId) : null;
            if (currentAssigneeId !== newAssigneeId) {
                if (newAssigneeId !== null) {
                    editActivities.push("assigned someone to the card");
                } else {
                    editActivities.push("unassigned the card");
                }
            }
        }
        if (projectId !== undefined) data.projectId = projectId ? Number(projectId) : null;

        if (tagIds !== undefined) {
            const currentTagIds = currentTask?.taskTags?.map(tt => tt.tagId) || [];
            const newTagIds = tagIds as number[];
            
            const addedTags = newTagIds.filter(id => !currentTagIds.includes(id));
            const removedTags = currentTagIds.filter(id => !newTagIds.includes(id));
            
            if (addedTags.length > 0 || removedTags.length > 0) {
                editActivities.push("updated the tags");
            }
            
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

        if (sprintIds !== undefined) {
            const currentSprintTask = await getPrismaClient().sprintTask.findMany({
                where: { taskId: Number(taskId) },
                select: { sprintId: true },
            });
            const currentSprintIds = currentSprintTask.map(st => st.sprintId);
            const newSprintIds = sprintIds as number[];
            
            const addedSprints = newSprintIds.filter(id => !currentSprintIds.includes(id));
            const removedSprints = currentSprintIds.filter(id => !newSprintIds.includes(id));
            
            if (addedSprints.length > 0 || removedSprints.length > 0) {
                editActivities.push("updated the sprints");
            }
            
            await getPrismaClient().sprintTask.deleteMany({
                where: { taskId: Number(taskId) },
            });
            if (sprintIds.length > 0) {
                await getPrismaClient().sprintTask.createMany({
                    data: sprintIds.map((sprintId: number) => ({
                        taskId: Number(taskId),
                        sprintId,
                    })),
                });
            }
        }

        if (subtaskIds !== undefined) {
            const currentSubtaskTask = await getPrismaClient().task.findUnique({
                where: { id: Number(taskId) },
                include: { subtasks: { select: { id: true } } },
            });
            
            const currentSubtaskIds = currentSubtaskTask?.subtasks.map(s => s.id) || [];
            const newSubtaskIds = subtaskIds as number[];
            
            const toAdd = newSubtaskIds.filter(id => !currentSubtaskIds.includes(id));
            if (toAdd.length > 0) {
                await getPrismaClient().task.updateMany({
                    where: { id: { in: toAdd } },
                    data: { parentTaskId: Number(taskId) },
                });
            }
            
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
            include: taskInclude,
        });
        
        if (userId && editActivities.length > 0) {
            for (const editField of editActivities) {
                try {
                    await createActivity({
                        taskId: Number(taskId),
                        userId: userId,
                        activityType: ActivityType.EDIT_TASK,
                        editField: editField,
                    });
                } catch (activityError: any) {
                    console.error("Error creating activity for task edit:", activityError.message);
                }
            }
        }
        
        res.json(transformTask(updatedTask));
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
            include: taskInclude,
        });
        
        const tasksWithStringStatus = tasks.map(transformTask);
        res.json(tasksWithStringStatus);
    } catch (error: any) {
        res.status(500).json({ error: `Error retrieving user's tasks: ${error.message}` });
    }
};

export const getTasksAssignedToUser = async (
    req: Request,
    res: Response
): Promise<void> => {
    const { userId } = req.params;
    try {
        const tasks = await getPrismaClient().task.findMany({
            where: {
                assignedUserId: Number(userId),
            },
            include: taskInclude,
        });
        
        const tasksWithStringStatus = tasks.map(transformTask);
        res.json(tasksWithStringStatus);
    } catch (error: any) {
        res.status(500).json({ error: `Error retrieving assigned tasks: ${error.message}` });
    }
};

export const getTasksAuthoredByUser = async (
    req: Request,
    res: Response
): Promise<void> => {
    const { userId } = req.params;
    try {
        const tasks = await getPrismaClient().task.findMany({
            where: {
                authorUserId: Number(userId),
            },
            include: taskInclude,
        });
        
        const tasksWithStringStatus = tasks.map(transformTask);
        res.json(tasksWithStringStatus);
    } catch (error: any) {
        res.status(500).json({ error: `Error retrieving authored tasks: ${error.message}` });
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
