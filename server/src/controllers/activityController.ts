import type { Request, Response } from "express";
import { getPrismaClient } from "../lib/prisma.ts";

// Activity type constants (using const object instead of enum for Node.js strip-only mode)
export const ActivityType = {
    CREATE_TASK: 0,
    MOVE_TASK: 1,
    EDIT_TASK: 2,
} as const;

export type ActivityType = (typeof ActivityType)[keyof typeof ActivityType];

// Interface for creating activities (internal use)
export interface CreateActivityInput {
    taskId: number;
    userId: number;
    activityType: ActivityType;
    previousStatus?: string;
    newStatus?: string;
    editField?: string;
}

/**
 * Get all activities for a task
 * GET /activities?taskId=:taskId
 *
 * - Returns all activities sorted by timestamp in descending order (newest first)
 * - Includes user information (username) for each activity
 */
export const getActivitiesByTask = async (req: Request, res: Response): Promise<void> => {
    const { taskId } = req.query;

    // Validate taskId is provided
    if (!taskId) {
        res.status(400).json({ error: "Missing required field: taskId" });
        return;
    }

    const numericTaskId = Number(taskId);

    if (isNaN(numericTaskId)) {
        res.status(400).json({ error: "Invalid taskId: must be a number" });
        return;
    }

    try {
        // Verify task exists
        const task = await getPrismaClient().task.findUnique({
            where: { id: numericTaskId },
        });

        if (!task) {
            res.status(404).json({ error: "Task not found" });
            return;
        }

        // Fetch activities with user information, sorted by createdAt descending
        const activities = await getPrismaClient().activity.findMany({
            where: { taskId: numericTaskId },
            include: {
                user: {
                    select: {
                        userId: true,
                        username: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        res.json(activities);
    } catch (error: any) {
        console.error("Error fetching activities:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

/**
 * Create a new activity (internal use by other controllers)
 *
 * - Creates activities when tasks are created, moved, or edited
 * - Sets the activity timestamp to the current server time
 */
export const createActivity = async (
    data: CreateActivityInput
): Promise<
    ReturnType<typeof getPrismaClient>["activity"]["create"] extends (
        ...args: any
    ) => Promise<infer R>
        ? R
        : never
> => {
    const { taskId, userId, activityType, previousStatus, newStatus, editField } = data;

    // Validate activity type
    if (
        ![ActivityType.CREATE_TASK, ActivityType.MOVE_TASK, ActivityType.EDIT_TASK].includes(
            activityType
        )
    ) {
        throw new Error("Invalid activity type");
    }

    // Validate Move Task activity has status fields
    if (activityType === ActivityType.MOVE_TASK) {
        if (!previousStatus || !newStatus) {
            throw new Error("Move Task activity requires previousStatus and newStatus");
        }
    }

    // Validate Edit Task activity has editField
    if (activityType === ActivityType.EDIT_TASK) {
        if (!editField || editField.trim() === "") {
            throw new Error("Edit Task activity requires editField");
        }
    }

    try {
        const activity = await getPrismaClient().activity.create({
            data: {
                taskId,
                userId,
                activityType,
                previousStatus: previousStatus ?? null,
                newStatus: newStatus ?? null,
                editField: editField ?? null,
            },
            include: {
                user: {
                    select: {
                        userId: true,
                        username: true,
                    },
                },
            },
        });

        return activity;
    } catch (error: any) {
        console.error("Error creating activity:", error.message);
        throw error;
    }
};
