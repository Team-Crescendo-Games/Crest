import type { Request, Response } from "express";
import { getPrismaClient } from "../lib/prisma.ts";
import { statusIntToString } from "../lib/statusUtils.ts";

/**
 * Get all sprints with task counts for a specific workspace
 * GET /sprints?workspaceId=1
 */
export const getSprints = async (req: Request, res: Response) => {
    try {
        const { workspaceId } = req.query;

        if (!workspaceId) {
            res.status(400).json({ error: "workspaceId is required" });
            return;
        }

        const sprints = await getPrismaClient().sprint.findMany({
            where: { workspaceId: Number(workspaceId) },
            include: {
                _count: {
                    select: { sprintTasks: true },
                },
            },
        });
        res.json(sprints);
    } catch (error: any) {
        console.error("Error fetching sprints:", error.message);
        res.status(500).json({ error: "Failed to fetch sprints: " + error.message });
    }
};

/**
 * Get a single sprint with associated tasks
 * GET /sprints/:sprintId
 */
export const getSprint = async (req: Request, res: Response) => {
    try {
        const { sprintId } = req.params;
        const id = Number(sprintId);

        if (isNaN(id)) {
            res.status(400).json({ error: "Invalid sprint ID" });
            return;
        }

        const sprint = await getPrismaClient().sprint.findUnique({
            where: { id },
            include: {
                sprintTasks: {
                    include: {
                        task: {
                            include: {
                                author: true,
                                comments: {
                                    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
                                    include: {
                                        user: true,
                                        reactions: {
                                            include: {
                                                user: {
                                                    select: {
                                                        userId: true,
                                                        username: true,
                                                        fullName: true,
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                                attachments: true,
                                activities: {
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
                                    orderBy: { createdAt: "desc" },
                                },
                                taskTags: {
                                    include: {
                                        tag: true,
                                    },
                                },
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
                    },
                },
            },
        });

        if (!sprint) {
            res.status(404).json({ error: "Sprint not found" });
            return;
        }

        // Transform the response to include tasks directly with string status and sprints
        const response = {
            ...sprint,
            tasks: sprint.sprintTasks.map((st) => ({
                ...st.task,
                status: statusIntToString(st.task.status),
                subtasks: st.task.subtasks?.map((subtask) => ({
                    ...subtask,
                    status: statusIntToString(subtask.status),
                })),
                sprints: st.task.sprintTasks?.map((sprintTask) => sprintTask.sprint),
            })),
        };

        res.json(response);
    } catch (error: any) {
        console.error("Error fetching sprint:", error.message);
        res.status(500).json({ error: "Failed to fetch sprint: " + error.message });
    }
};

/**
 * Create a new sprint within a workspace
 * POST /sprints
 */
export const createSprint = async (req: Request, res: Response) => {
    try {
        const { title, startDate, dueDate, workspaceId } = req.body;

        if (!workspaceId) {
            res.status(400).json({ error: "workspaceId is required" });
            return;
        }

        // Validate required title
        if (!title || (typeof title === "string" && title.trim() === "")) {
            res.status(400).json({ error: "Title is required" });
            return;
        }

        const sprint = await getPrismaClient().sprint.create({
            data: {
                title: title.trim(),
                startDate: startDate ? new Date(startDate) : null,
                dueDate: dueDate ? new Date(dueDate) : null,
                workspaceId: Number(workspaceId),
            },
        });

        res.status(201).json(sprint);
    } catch (error: any) {
        console.error("Error creating sprint:", error.message);
        res.status(500).json({ error: "Failed to create sprint: " + error.message });
    }
};

/**
 * Update an existing sprint
 * PATCH /sprints/:sprintId
 */
export const updateSprint = async (req: Request, res: Response) => {
    try {
        const { sprintId } = req.params;
        const { title, startDate, dueDate } = req.body;
        const id = Number(sprintId);

        if (isNaN(id)) {
            res.status(400).json({ error: "Invalid sprint ID" });
            return;
        }

        const existingSprint = await getPrismaClient().sprint.findUnique({
            where: { id },
        });

        if (!existingSprint) {
            res.status(404).json({ error: "Sprint not found" });
            return;
        }

        if (title !== undefined && (typeof title !== "string" || title.trim() === "")) {
            res.status(400).json({ error: "Title is required" });
            return;
        }

        const updateData: {
            title?: string;
            startDate?: Date | null;
            dueDate?: Date | null;
        } = {};

        if (title !== undefined) updateData.title = title.trim();
        if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
        if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;

        const sprint = await getPrismaClient().sprint.update({
            where: { id },
            data: updateData,
        });

        res.json(sprint);
    } catch (error: any) {
        console.error("Error updating sprint:", error.message);
        res.status(500).json({ error: "Failed to update sprint: " + error.message });
    }
};

/**
 * Delete a sprint
 * DELETE /sprints/:sprintId
 */
export const deleteSprint = async (req: Request, res: Response) => {
    try {
        const { sprintId } = req.params;
        const id = Number(sprintId);

        if (isNaN(id)) {
            res.status(400).json({ error: "Invalid sprint ID" });
            return;
        }

        const existingSprint = await getPrismaClient().sprint.findUnique({
            where: { id },
        });

        if (!existingSprint) {
            res.status(404).json({ error: "Sprint not found" });
            return;
        }

        await getPrismaClient().sprint.delete({
            where: { id },
        });

        res.status(204).send();
    } catch (error: any) {
        console.error("Error deleting sprint:", error.message);
        res.status(500).json({ error: "Failed to delete sprint: " + error.message });
    }
};

/**
 * Add a task to a sprint
 * POST /sprints/:sprintId/tasks/:taskId
 */
export const addTaskToSprint = async (req: Request, res: Response) => {
    try {
        const { sprintId, taskId } = req.params;
        const sprintIdNum = Number(sprintId);
        const taskIdNum = Number(taskId);

        if (isNaN(sprintIdNum)) {
            res.status(400).json({ error: "Invalid sprint ID" });
            return;
        }
        if (isNaN(taskIdNum)) {
            res.status(400).json({ error: "Invalid task ID" });
            return;
        }

        const sprint = await getPrismaClient().sprint.findUnique({
            where: { id: sprintIdNum },
        });

        if (!sprint) {
            res.status(404).json({ error: "Sprint not found" });
            return;
        }

        const task = await getPrismaClient().task.findUnique({
            where: { id: taskIdNum },
        });

        if (!task) {
            res.status(404).json({ error: "Task not found" });
            return;
        }

        const existingAssociation = await getPrismaClient().sprintTask.findUnique({
            where: {
                sprintId_taskId: {
                    sprintId: sprintIdNum,
                    taskId: taskIdNum,
                },
            },
        });

        if (existingAssociation) {
            res.status(200).json(existingAssociation);
            return;
        }

        const sprintTask = await getPrismaClient().sprintTask.create({
            data: {
                sprintId: sprintIdNum,
                taskId: taskIdNum,
            },
        });

        res.status(201).json(sprintTask);
    } catch (error: any) {
        console.error("Error adding task to sprint:", error.message);
        res.status(500).json({ error: "Failed to add task to sprint: " + error.message });
    }
};

/**
 * Remove a task from a sprint
 * DELETE /sprints/:sprintId/tasks/:taskId
 */
export const removeTaskFromSprint = async (req: Request, res: Response) => {
    try {
        const { sprintId, taskId } = req.params;
        const sprintIdNum = Number(sprintId);
        const taskIdNum = Number(taskId);

        if (isNaN(sprintIdNum)) {
            res.status(400).json({ error: "Invalid sprint ID" });
            return;
        }
        if (isNaN(taskIdNum)) {
            res.status(400).json({ error: "Invalid task ID" });
            return;
        }

        const sprint = await getPrismaClient().sprint.findUnique({
            where: { id: sprintIdNum },
        });

        if (!sprint) {
            res.status(404).json({ error: "Sprint not found" });
            return;
        }

        const task = await getPrismaClient().task.findUnique({
            where: { id: taskIdNum },
        });

        if (!task) {
            res.status(404).json({ error: "Task not found" });
            return;
        }

        await getPrismaClient().sprintTask.deleteMany({
            where: {
                sprintId: sprintIdNum,
                taskId: taskIdNum,
            },
        });

        res.status(204).send();
    } catch (error: any) {
        console.error("Error removing task from sprint:", error.message);
        res.status(500).json({ error: "Failed to remove task from sprint: " + error.message });
    }
};

/**
 * Archive/unarchive a sprint (toggle isActive)
 * PATCH /sprints/:sprintId/archive
 */
export const archiveSprint = async (req: Request, res: Response) => {
    try {
        const { sprintId } = req.params;
        const id = Number(sprintId);

        if (isNaN(id)) {
            res.status(400).json({ error: "Invalid sprint ID" });
            return;
        }

        const existingSprint = await getPrismaClient().sprint.findUnique({
            where: { id },
        });

        if (!existingSprint) {
            res.status(404).json({ error: "Sprint not found" });
            return;
        }

        const sprint = await getPrismaClient().sprint.update({
            where: { id },
            data: { isActive: !existingSprint.isActive },
        });

        res.json(sprint);
    } catch (error: any) {
        console.error("Error archiving sprint:", error.message);
        res.status(500).json({ error: "Failed to archive sprint: " + error.message });
    }
};

/**
 * Duplicate a sprint with all its tasks
 * POST /sprints/:sprintId/duplicate
 */
export const duplicateSprint = async (req: Request, res: Response) => {
    try {
        const { sprintId } = req.params;
        const { title, includeFinishedTasks = false } = req.body;
        const id = Number(sprintId);

        if (isNaN(id)) {
            res.status(400).json({ error: "Invalid sprint ID" });
            return;
        }

        const originalSprint = await getPrismaClient().sprint.findUnique({
            where: { id },
            include: {
                sprintTasks: {
                    include: {
                        task: {
                            select: { id: true, status: true },
                        },
                    },
                },
            },
        });

        if (!originalSprint) {
            res.status(404).json({ error: "Sprint not found" });
            return;
        }

        const newTitle = title?.trim() || `Copy of ${originalSprint.title}`;
        const newSprint = await getPrismaClient().sprint.create({
            data: {
                title: newTitle,
                startDate: originalSprint.startDate,
                dueDate: originalSprint.dueDate,
                workspaceId: originalSprint.workspaceId,
            },
        });

        const tasksToMigrate = includeFinishedTasks
            ? originalSprint.sprintTasks
            : originalSprint.sprintTasks.filter((st) => st.task.status !== 3);

        if (tasksToMigrate.length > 0) {
            await getPrismaClient().sprintTask.createMany({
                data: tasksToMigrate.map((st) => ({
                    sprintId: newSprint.id,
                    taskId: st.taskId,
                })),
            });
        }

        const result = await getPrismaClient().sprint.findUnique({
            where: { id: newSprint.id },
            include: {
                _count: {
                    select: { sprintTasks: true },
                },
            },
        });

        res.status(201).json(result);
    } catch (error: any) {
        console.error("Error duplicating sprint:", error.message);
        res.status(500).json({ error: "Failed to duplicate sprint: " + error.message });
    }
};
