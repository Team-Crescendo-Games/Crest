import type { Request, Response } from "express";
import { getPrismaClient } from "../lib/prisma.ts";
import { statusIntToString, statusStringToInt } from "../lib/statusUtils.ts";
import { createActivity, ActivityType } from "./activityController.ts";
import {
    createTaskEditNotifications,
    createReassignmentNotifications,
    createNotification,
    NotificationType,
    NotificationSeverity,
} from "../services/notificationService.ts";

// Common include object for task queries
const taskInclude = {
    author: true,
    comments: {
        orderBy: [{ createdAt: "asc" as const }, { id: "asc" as const }],
        include: {
            user: true,
            reactions: {
                include: {
                    user: {
                        select: { userId: true, username: true, fullName: true },
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
            taskAssignments: {
                include: {
                    user: {
                        select: {
                            userId: true,
                            username: true,
                            fullName: true,
                            profilePictureExt: true,
                        },
                    },
                },
            },
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
                select: { userId: true, username: true, fullName: true },
            },
        },
        orderBy: {
            createdAt: "desc" as const,
        },
    },
    taskAssignments: {
        include: {
            user: {
                select: {
                    userId: true,
                    username: true,
                    fullName: true,
                    profilePictureExt: true,
                },
            },
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
    taskAssignments: task.taskAssignments ?? [],
});

// Types for update task handlers
interface UpdateContext {
    taskId: number;
    currentTask: any;
    data: Record<string, any>;
    editActivities: string[];
}

// Field update handlers for updateTask
function clampString(str: string, maxLength: number = 50): string {
    return str.length > maxLength ? str.slice(0, maxLength) + "..." : str;
}

function handleTitleUpdate(ctx: UpdateContext, title: string | undefined): void {
    if (title === undefined) return;
    ctx.data.title = title;
    if (ctx.currentTask && ctx.currentTask.title !== title) {
        ctx.editActivities.push(`updated the title to "${clampString(title)}"`);
    }
}

function handleDescriptionUpdate(ctx: UpdateContext, description: string | undefined): void {
    if (description === undefined) return;
    ctx.data.description = description;
    if (ctx.currentTask && ctx.currentTask.description !== description) {
        ctx.editActivities.push("updated the description");
    }
}

function handleStatusUpdate(ctx: UpdateContext, status: string | undefined): void {
    if (status === undefined) return;
    ctx.data.status = statusStringToInt(status);
    const currentStatusString = statusIntToString(ctx.currentTask?.status ?? null);
    if (ctx.currentTask && currentStatusString !== status) {
        ctx.editActivities.push(`changed the status to ${status}`);
    }
}

function handlePriorityUpdate(ctx: UpdateContext, priority: string | undefined): void {
    if (priority === undefined) return;
    ctx.data.priority = priority || null;
    if (ctx.currentTask && ctx.currentTask.priority !== (priority || null)) {
        if (priority) {
            ctx.editActivities.push(`changed the priority to ${priority}`);
        } else {
            ctx.editActivities.push("removed the priority");
        }
    }
}

function handleStartDateUpdate(ctx: UpdateContext, startDate: string | undefined): void {
    if (startDate === undefined) return;
    ctx.data.startDate = startDate ? new Date(startDate) : null;
    const currentStartDate = ctx.currentTask?.startDate?.toISOString().split("T")[0] || null;
    const newStartDate = startDate ? new Date(startDate).toISOString().split("T")[0] : null;
    if (currentStartDate !== newStartDate) {
        ctx.editActivities.push(startDate ? "set the start date" : "removed the start date");
    }
}

function handleDueDateUpdate(ctx: UpdateContext, dueDate: string | undefined): void {
    if (dueDate === undefined) return;
    ctx.data.dueDate = dueDate ? new Date(dueDate) : null;
    const currentDueDate = ctx.currentTask?.dueDate?.toISOString().split("T")[0] || null;
    const newDueDate = dueDate ? new Date(dueDate).toISOString().split("T")[0] : null;
    if (currentDueDate !== newDueDate) {
        ctx.editActivities.push(dueDate ? "set the due date" : "removed the due date");
    }
}

function handlePointsUpdate(ctx: UpdateContext, points: number | string | null | undefined): void {
    if (points === undefined) return;
    ctx.data.points = points !== null && points !== "" ? Number(points) : null;
    const currentPoints = ctx.currentTask?.points ?? null;
    const newPoints = points !== null && points !== "" ? Number(points) : null;
    if (currentPoints !== newPoints) {
        ctx.editActivities.push(
            newPoints !== null ? `updated the points to ${newPoints}` : "removed the points"
        );
    }
}

function handleBoardIdUpdate(ctx: UpdateContext, boardId: number | undefined): void {
    if (boardId === undefined) return;
    ctx.data.boardId = boardId ? Number(boardId) : null;
}

async function handleTagsUpdate(ctx: UpdateContext, tagIds: number[] | undefined): Promise<void> {
    if (tagIds === undefined) return;

    const currentTagIds = ctx.currentTask?.taskTags?.map((tt: any) => tt.tagId) || [];
    const addedTags = tagIds.filter((id) => !currentTagIds.includes(id));
    const removedTags = currentTagIds.filter((id: number) => !tagIds.includes(id));

    if (addedTags.length > 0 || removedTags.length > 0) {
        ctx.editActivities.push("updated the tags");
    }

    await getPrismaClient().taskTag.deleteMany({ where: { taskId: ctx.taskId } });
    if (tagIds.length > 0) {
        await getPrismaClient().taskTag.createMany({
            data: tagIds.map((tagId: number) => ({ taskId: ctx.taskId, tagId })),
        });
    }
}

async function handleSprintsUpdate(
    ctx: UpdateContext,
    sprintIds: number[] | undefined
): Promise<void> {
    if (sprintIds === undefined) return;

    const currentSprintTasks = await getPrismaClient().sprintTask.findMany({
        where: { taskId: ctx.taskId },
        select: { sprintId: true, sprint: { select: { title: true } } },
    });
    const currentSprintIds = currentSprintTasks.map((st) => st.sprintId);

    const addedSprintIds = sprintIds.filter((id) => !currentSprintIds.includes(id));
    const removedSprintIds = currentSprintIds.filter((id) => !sprintIds.includes(id));

    if (addedSprintIds.length > 0 || removedSprintIds.length > 0) {
        const addedSprints =
            addedSprintIds.length > 0
                ? await getPrismaClient().sprint.findMany({
                      where: { id: { in: addedSprintIds } },
                      select: { title: true },
                  })
                : [];

        const removedSprintNames = currentSprintTasks
            .filter((st) => removedSprintIds.includes(st.sprintId))
            .map((st) => st.sprint.title);

        if (addedSprints.length > 0) {
            const names = addedSprints.map((s) => clampString(s.title, 30)).join(", ");
            ctx.editActivities.push(
                `added to sprint${addedSprints.length > 1 ? "s" : ""}: ${names}`
            );
        }
        if (removedSprintNames.length > 0) {
            const names = removedSprintNames.map((n) => clampString(n, 30)).join(", ");
            ctx.editActivities.push(
                `removed from sprint${removedSprintNames.length > 1 ? "s" : ""}: ${names}`
            );
        }
    }

    await getPrismaClient().sprintTask.deleteMany({ where: { taskId: ctx.taskId } });
    if (sprintIds.length > 0) {
        await getPrismaClient().sprintTask.createMany({
            data: sprintIds.map((sprintId: number) => ({ taskId: ctx.taskId, sprintId })),
        });
    }
}

async function handleAssigneesUpdate(
    ctx: UpdateContext,
    assigneeIds: number[] | undefined,
    userId: number
): Promise<void> {
    if (assigneeIds === undefined) return;

    const currentTaskAssignments = await getPrismaClient().taskAssignment.findMany({
        where: { taskId: ctx.taskId },
        select: { userId: true },
    });
    const currentAssigneeIds = currentTaskAssignments.map((ta) => ta.userId);

    const addedAssignees = assigneeIds.filter((id) => !currentAssigneeIds.includes(id));
    const removedAssignees = currentAssigneeIds.filter((id) => !assigneeIds.includes(id));

    if (addedAssignees.length > 0 || removedAssignees.length > 0) {
        ctx.editActivities.push("updated the assignees");

        try {
            await createReassignmentNotifications(
                ctx.taskId,
                addedAssignees,
                removedAssignees,
                userId
            );
        } catch (error) {
            console.error("Failed to create reassignment notifications:", error);
        }
    }

    await getPrismaClient().taskAssignment.deleteMany({ where: { taskId: ctx.taskId } });
    if (assigneeIds.length > 0) {
        await getPrismaClient().taskAssignment.createMany({
            data: assigneeIds.map((userId: number) => ({ taskId: ctx.taskId, userId })),
        });
    }
}

async function handleSubtasksUpdate(
    ctx: UpdateContext,
    subtaskIds: number[] | undefined
): Promise<void> {
    if (subtaskIds === undefined) return;

    const currentSubtaskTask = await getPrismaClient().task.findUnique({
        where: { id: ctx.taskId },
        include: { subtasks: { select: { id: true } } },
    });

    const currentSubtaskIds = currentSubtaskTask?.subtasks.map((s) => s.id) || [];

    const toAdd = subtaskIds.filter((id) => !currentSubtaskIds.includes(id));
    if (toAdd.length > 0) {
        await getPrismaClient().task.updateMany({
            where: { id: { in: toAdd } },
            data: { parentTaskId: ctx.taskId },
        });
    }

    const toRemove = currentSubtaskIds.filter((id) => !subtaskIds.includes(id));
    if (toRemove.length > 0) {
        await getPrismaClient().task.updateMany({
            where: { id: { in: toRemove } },
            data: { parentTaskId: null },
        });
    }
}

async function handleEditActivities(ctx: UpdateContext, userId: number): Promise<void> {
    if (!userId || ctx.editActivities.length === 0) return;

    for (const editField of ctx.editActivities) {
        try {
            await createActivity({
                taskId: ctx.taskId,
                userId: userId,
                activityType: ActivityType.EDIT_TASK,
                editField: editField,
            });
        } catch (activityError: any) {
            console.error("Error creating activity for task edit:", activityError.message);
        }
    }

    try {
        const latestActivity = await getPrismaClient().activity.findFirst({
            where: { taskId: ctx.taskId },
            orderBy: { createdAt: "desc" },
        });
        if (latestActivity) {
            await createTaskEditNotifications(ctx.taskId, latestActivity.id, userId);
        }
    } catch (error) {
        console.error("Failed to create task edit notifications:", error);
    }
}

export const getTasks = async (req: Request, res: Response) => {
    const { boardId } = req.query;

    if (!boardId) {
        res.status(400).json({ error: "boardId is required" });
        return;
    }

    try {
        const tasks = await getPrismaClient().task.findMany({
            where: {
                boardId: Number(boardId),
            },
            include: taskInclude,
        });

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

export const createTask = async (req: Request, res: Response): Promise<void> => {
    const {
        title,
        description,
        status,
        priority,
        startDate,
        dueDate,
        points,
        boardId,
        authorUserId,
        tagIds,
        sprintIds,
        assigneeIds,
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
                boardId: Number(boardId),
                authorUserId,
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
                ...(assigneeIds?.length && {
                    taskAssignments: {
                        create: assigneeIds.map((userId: number) => ({ userId })),
                    },
                }),
            },
            include: taskInclude,
        });

        // Create activity for new task
        try {
            await createActivity({
                taskId: newTask.id,
                userId: authorUserId,
                activityType: ActivityType.CREATE_TASK,
            });
        } catch (activityError: any) {
            console.error("Error creating activity for new task:", activityError.message);
        }

        // Create notifications for assignees when task is created
        if (assigneeIds?.length) {
            try {
                for (const assigneeId of assigneeIds) {
                    if (assigneeId === authorUserId) continue;

                    await createNotification({
                        userId: assigneeId,
                        type: NotificationType.TASK_REASSIGNED,
                        severity: NotificationSeverity.INFO,
                        taskId: newTask.id,
                        message: "You have been assigned to a new task",
                    });
                }
            } catch (error) {
                console.error("Failed to create assignment notifications:", error);
            }
        }

        res.status(201).json(transformTask(newTask));
    } catch (error: any) {
        res.status(500).json({ error: `Error creating a task: ${error.message}` });
    }
};

export const updateTaskStatus = async (req: Request, res: Response): Promise<void> => {
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

            try {
                const latestActivity = await getPrismaClient().activity.findFirst({
                    where: { taskId: Number(taskId) },
                    orderBy: { createdAt: "desc" },
                });
                if (latestActivity) {
                    await createTaskEditNotifications(Number(taskId), latestActivity.id, userId);
                }
            } catch (error) {
                console.error("Failed to create task edit notifications:", error);
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

export const updateTask = async (req: Request, res: Response): Promise<void> => {
    const { taskId } = req.params;
    const {
        title,
        description,
        status,
        priority,
        startDate,
        dueDate,
        points,
        tagIds,
        subtaskIds,
        boardId,
        sprintIds,
        userId,
        assigneeIds,
    } = req.body;

    try {
        const currentTask = await getPrismaClient().task.findUnique({
            where: { id: Number(taskId) },
            include: { taskTags: { include: { tag: true } } },
        });

        const ctx: UpdateContext = {
            taskId: Number(taskId),
            currentTask,
            data: {},
            editActivities: [],
        };

        handleTitleUpdate(ctx, title);
        handleDescriptionUpdate(ctx, description);
        handleStatusUpdate(ctx, status);
        handlePriorityUpdate(ctx, priority);
        handleStartDateUpdate(ctx, startDate);
        handleDueDateUpdate(ctx, dueDate);
        handlePointsUpdate(ctx, points);
        handleBoardIdUpdate(ctx, boardId);

        await handleTagsUpdate(ctx, tagIds);
        await handleSprintsUpdate(ctx, sprintIds);
        await handleAssigneesUpdate(ctx, assigneeIds, userId);
        await handleSubtasksUpdate(ctx, subtaskIds);

        const updatedTask = await getPrismaClient().task.update({
            where: { id: ctx.taskId },
            data: ctx.data,
            include: taskInclude,
        });

        await handleEditActivities(ctx, userId);

        res.json(transformTask(updatedTask));
    } catch (error: any) {
        res.status(500).json({ error: `Error updating task: ${error.message}` });
    }
};

export const getUserTasks = async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params;
    try {
        const tasks = await getPrismaClient().task.findMany({
            where: {
                OR: [
                    { authorUserId: Number(userId) },
                    { taskAssignments: { some: { userId: Number(userId) } } },
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

export const getTasksAssignedToUser = async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params;
    try {
        const tasks = await getPrismaClient().task.findMany({
            where: {
                taskAssignments: { some: { userId: Number(userId) } },
            },
            include: taskInclude,
        });

        const tasksWithStringStatus = tasks.map(transformTask);
        res.json(tasksWithStringStatus);
    } catch (error: any) {
        res.status(500).json({ error: `Error retrieving assigned tasks: ${error.message}` });
    }
};

export const getTasksAuthoredByUser = async (req: Request, res: Response): Promise<void> => {
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

export const deleteTask = async (req: Request, res: Response): Promise<void> => {
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
