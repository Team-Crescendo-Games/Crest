import type { Request, Response } from "express";
import { getPrismaClient } from "../lib/prisma.ts";
import { statusIntToString, statusStringToInt } from "../lib/statusUtils.ts";
import { createActivity, ActivityType } from "./activityController.ts";
import { createTaskEditNotifications, createReassignmentNotifications, createNotification, NotificationType, NotificationSeverity } from "../services/notificationService.ts";

// Common include object for task queries
const taskInclude = {
    author: true,
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
            taskAssignments: {
                include: {
                    user: { select: { userId: true, username: true, profilePictureExt: true } },
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
                select: { userId: true, username: true },
            },
        },
        orderBy: {
            createdAt: 'desc' as const,
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
                projectId,
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
        
        // Create notifications for assignees when task is created (excluding the author)
        if (assigneeIds?.length) {
            try {
                for (const assigneeId of assigneeIds) {
                    // Don't notify the author if they assigned themselves
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
            
            // Create task edit notifications for assignees (excluding the editor)
            // Requirements: 5.1, 5.2
            try {
                const latestActivity = await getPrismaClient().activity.findFirst({
                    where: { taskId: Number(taskId) },
                    orderBy: { createdAt: 'desc' },
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

export const updateTask = async (
    req: Request,
    res: Response
): Promise<void> => {
    const { taskId } = req.params;
    const { title, description, status, priority, startDate, dueDate, points, tagIds, subtaskIds, projectId, sprintIds, userId, assigneeIds } = req.body;
    try {
        const currentTask = await getPrismaClient().task.findUnique({
            where: { id: Number(taskId) },
            include: {
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

        if (assigneeIds !== undefined) {
            // Get current task assignments to track changes
            const currentTaskAssignments = await getPrismaClient().taskAssignment.findMany({
                where: { taskId: Number(taskId) },
                select: { userId: true },
            });
            const currentAssigneeIds = currentTaskAssignments.map(ta => ta.userId);
            const newAssigneeIds = assigneeIds as number[];
            
            // Track assignee changes for activity logging
            const addedAssignees = newAssigneeIds.filter(id => !currentAssigneeIds.includes(id));
            const removedAssignees = currentAssigneeIds.filter(id => !newAssigneeIds.includes(id));
            
            if (addedAssignees.length > 0 || removedAssignees.length > 0) {
                editActivities.push("updated the assignees");
            }
            
            // Create reassignment notifications for added/removed assignees
            // Requirements: 6.1, 6.2, 6.4
            if (addedAssignees.length > 0 || removedAssignees.length > 0) {
                try {
                    await createReassignmentNotifications(
                        Number(taskId),
                        addedAssignees,
                        removedAssignees,
                        userId
                    );
                } catch (error) {
                    console.error("Failed to create reassignment notifications:", error);
                }
            }
            
            // Delete existing TaskAssignment records for the task
            await getPrismaClient().taskAssignment.deleteMany({
                where: { taskId: Number(taskId) },
            });
            
            // Create new TaskAssignment records for the provided userIds
            if (newAssigneeIds.length > 0) {
                await getPrismaClient().taskAssignment.createMany({
                    data: newAssigneeIds.map((userId: number) => ({
                        taskId: Number(taskId),
                        userId,
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
            
            // Create task edit notifications for assignees (excluding the editor)
            // Requirements: 5.1, 5.2
            try {
                // Get the most recent activity for this task edit
                const latestActivity = await getPrismaClient().activity.findFirst({
                    where: { taskId: Number(taskId) },
                    orderBy: { createdAt: 'desc' },
                });
                if (latestActivity) {
                    await createTaskEditNotifications(Number(taskId), latestActivity.id, userId);
                }
            } catch (error) {
                console.error("Failed to create task edit notifications:", error);
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

export const getTasksAssignedToUser = async (
    req: Request,
    res: Response
): Promise<void> => {
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
