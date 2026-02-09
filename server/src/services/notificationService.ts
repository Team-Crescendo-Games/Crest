import { PrismaClient, type Notification } from '../../prisma/generated/prisma/client.js';
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

// Lazy initialization of Prisma client (following existing pattern from controllers)
let prisma: PrismaClient;

function getPrismaClient() {
    if (!prisma) {
        const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
        const adapter = new PrismaPg(pool);
        prisma = new PrismaClient({ adapter });
    }
    return prisma;
}

/**
 * Notification types as defined in Requirements 1.3
 * Maps to the `type` field in the Notification model
 */
export const NotificationType = {
    MENTION: 0,
    NEAR_OVERDUE: 1,
    OVERDUE: 2,
    TASK_EDITED: 3,
    TASK_REASSIGNED: 4,
} as const;

export type NotificationType = typeof NotificationType[keyof typeof NotificationType];

/**
 * Notification severity levels as defined in Requirements 1.2
 * Maps to the `severity` field in the Notification model
 * - INFO: No special color coding
 * - MEDIUM: Orange color indicator
 * - CRITICAL: Red color indicator
 */
export const NotificationSeverity = {
    INFO: 0,
    MEDIUM: 1,
    CRITICAL: 2,
} as const;

export type NotificationSeverity = typeof NotificationSeverity[keyof typeof NotificationSeverity];

/**
 * Parameters for creating a notification
 */
export interface CreateNotificationParams {
    userId: number;
    type: NotificationType;
    severity: NotificationSeverity;
    taskId?: number;
    commentId?: number;
    activityId?: number;
    message?: string;
}

/**
 * Creates a notification in the database.
 * 
 * Requirements validated:
 * - 1.2: Supports severity values of Info, Medium, and Critical
 * - 1.3: Supports notification types for Mention, NearOverdue, Overdue, TaskEdited, and TaskReassigned
 * - 1.4: Defaults isRead to false (handled by Prisma schema default)
 * 
 * @param params - The notification parameters
 * @returns The created Notification record
 */
export async function createNotification(params: CreateNotificationParams): Promise<Notification> {
    const { userId, type, severity, taskId, commentId, activityId, message } = params;

    const notification = await getPrismaClient().notification.create({
        data: {
            userId,
            type,
            severity,
            taskId: taskId ?? null,
            commentId: commentId ?? null,
            activityId: activityId ?? null,
            message: message ?? null,
            // isRead defaults to false per Prisma schema (Requirement 1.4)
        },
        include: {
            task: {
                select: {
                    id: true,
                    title: true,
                },
            },
            comment: {
                select: {
                    id: true,
                    text: true,
                },
            },
            activity: {
                select: {
                    id: true,
                    activityType: true,
                    editField: true,
                },
            },
        },
    });

    return notification;
}

/**
 * Parses @mentions from text and returns unique usernames (without the @ symbol).
 * 
 * The regex pattern matches @username where username consists of word characters
 * (letters, numbers, underscores). Mentions can appear at the start of text,
 * after whitespace, or after punctuation.
 * 
 * @param text - The text to parse for @mentions
 * @returns Array of unique usernames (without @ symbol)
 */
export function parseMentions(text: string): string[] {
    if (!text) {
        return [];
    }

    // Match @username patterns
    // - @ followed by one or more word characters (letters, numbers, underscores)
    // - Can appear at start of string, after whitespace, or after common punctuation
    const mentionRegex = /(?:^|[\s.,!?;:()\[\]{}])@(\w+)/g;
    
    const mentions: string[] = [];
    let match: RegExpExecArray | null;
    
    while ((match = mentionRegex.exec(text)) !== null) {
        const username = match[1];
        if (username) {
            // Only add if not already in the list (case-insensitive deduplication)
            if (!mentions.some(m => m.toLowerCase() === username.toLowerCase())) {
                mentions.push(username);
            }
        }
    }
    
    return mentions;
}

/**
 * Creates mention notifications for users mentioned in a comment.
 * 
 * Requirements validated:
 * - 2.1: Creates Info severity notification for each mentioned user
 * - 2.2: Matches @username against existing usernames (case-insensitive)
 * - 2.3: Does NOT create notification for the comment author (self-mention)
 * - 2.4: Notification references both the comment and the associated task
 * 
 * @param commentId - The ID of the comment containing mentions
 * @param commentText - The text content of the comment
 * @param taskId - The ID of the task the comment belongs to
 * @param authorUserId - The user ID of the comment author (to exclude from notifications)
 */
export async function createMentionNotifications(
    commentId: number,
    commentText: string,
    taskId: number,
    authorUserId: number
): Promise<void> {
    // Parse @mentions from the comment text
    const mentionedUsernames = parseMentions(commentText);
    
    if (mentionedUsernames.length === 0) {
        return;
    }

    const prismaClient = getPrismaClient();

    // Look up users by username (case-insensitive)
    // Requirement 2.2: Case-insensitive username matching
    const users = await prismaClient.user.findMany({
        where: {
            username: {
                in: mentionedUsernames,
                mode: 'insensitive', // Case-insensitive matching
            },
        },
        select: {
            userId: true,
            username: true,
        },
    });

    // Create notifications for each mentioned user
    for (const user of users) {
        // Requirement 2.3: Exclude self-mentions (comment author)
        if (user.userId === authorUserId) {
            continue;
        }

        // Requirement 2.1: Create Info severity notification
        // Requirement 2.4: Reference both comment and task
        await createNotification({
            userId: user.userId,
            type: NotificationType.MENTION,
            severity: NotificationSeverity.INFO,
            taskId: taskId,
            commentId: commentId,
            message: `You were mentioned in a comment`,
        });
    }
}

/**
 * Creates task edit notifications for all assignees of a task.
 * 
 * Requirements validated:
 * - 5.1: Creates notification for each assigned user (excluding the user who made the change)
 * - 5.2: Notification references both the task and the Activity record
 * - 5.4: Notification severity for task edits is Info
 * 
 * @param taskId - The ID of the task that was edited
 * @param activityId - The ID of the Activity record for this edit
 * @param excludeUserId - The user ID of the person who made the edit (to exclude from notifications)
 */
export async function createTaskEditNotifications(
    taskId: number,
    activityId: number,
    excludeUserId: number
): Promise<void> {
    const prismaClient = getPrismaClient();

    // Get all assignees for the task via TaskAssignment
    const taskAssignments = await prismaClient.taskAssignment.findMany({
        where: {
            taskId: taskId,
        },
        select: {
            userId: true,
        },
    });

    // Create notifications for each assignee (excluding the editor)
    for (const assignment of taskAssignments) {
        // Requirement 5.1: Exclude the user who made the edit
        if (assignment.userId === excludeUserId) {
            continue;
        }

        // Requirement 5.4: Info severity for task edits
        // Requirement 5.2: Link to both task and activity
        await createNotification({
            userId: assignment.userId,
            type: NotificationType.TASK_EDITED,
            severity: NotificationSeverity.INFO,
            taskId: taskId,
            activityId: activityId,
            message: `A task you're assigned to was edited`,
        });
    }
}

/**
 * Creates reassignment notifications for users added to or removed from a task.
 * 
 * Requirements validated:
 * - 6.1: Creates Info notification for users added as assignees
 * - 6.2: Creates Info notification for users removed as assignees
 * - 6.3: Notification references the associated task
 * - 6.4: Excludes the user making the change from receiving notifications
 * 
 * @param taskId - The ID of the task being reassigned
 * @param addedUserIds - Array of user IDs that were added as assignees
 * @param removedUserIds - Array of user IDs that were removed as assignees
 * @param changedByUserId - The user ID of the person making the change (to exclude from notifications)
 */
export async function createReassignmentNotifications(
    taskId: number,
    addedUserIds: number[],
    removedUserIds: number[],
    changedByUserId: number
): Promise<void> {
    // Create notifications for users added as assignees
    // Requirement 6.1: Info notification for newly assigned users
    for (const userId of addedUserIds) {
        // Requirement 6.4: Exclude the user making the change
        if (userId === changedByUserId) {
            continue;
        }

        // Requirement 6.3: Reference the associated task
        await createNotification({
            userId: userId,
            type: NotificationType.TASK_REASSIGNED,
            severity: NotificationSeverity.INFO,
            taskId: taskId,
            message: `You have been assigned to a task`,
        });
    }

    // Create notifications for users removed as assignees
    // Requirement 6.2: Info notification for removed users
    for (const userId of removedUserIds) {
        // Requirement 6.4: Exclude the user making the change
        if (userId === changedByUserId) {
            continue;
        }

        // Requirement 6.3: Reference the associated task
        await createNotification({
            userId: userId,
            type: NotificationType.TASK_REASSIGNED,
            severity: NotificationSeverity.INFO,
            taskId: taskId,
            message: `You have been removed from a task`,
        });
    }
}

/**
 * Task status constant for Done/Completed status.
 * Tasks in this status should not receive due date notifications.
 */
const DONE_STATUS = 3;

/**
 * Checks for tasks with approaching or past due dates and creates notifications.
 * 
 * This function queries for:
 * 1. Near-overdue tasks: Due date within 24 hours from now
 * 2. Overdue tasks: Due date has already passed
 * 
 * Requirements validated:
 * - 3.1: Creates Info severity notification for near-overdue tasks
 * - 3.2: Excludes tasks in Done status (status = 3)
 * - 3.3: Notification references the associated task
 * - 3.4: Prevents duplicate notifications for same task/user/type combination
 * - 4.1: Creates Critical severity notification for overdue tasks
 * - 4.2: Excludes tasks in Done status (status = 3)
 * - 4.3: Notification references the associated task
 * - 4.4: Prevents duplicate notifications for same task/user/type combination
 */
export async function checkAndCreateDueDateNotifications(): Promise<void> {
    const prismaClient = getPrismaClient();
    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Query for near-overdue tasks: due date is within 24 hours but not yet passed
    // Requirement 3.2: Exclude tasks in Done status
    const nearOverdueTasks = await prismaClient.task.findMany({
        where: {
            dueDate: {
                gt: now,                    // Due date is in the future
                lte: twentyFourHoursFromNow // But within 24 hours
            },
            OR: [
                { status: null },           // No status set
                { status: { not: DONE_STATUS } } // Not in Done status
            ]
        },
        include: {
            taskAssignments: {
                select: {
                    userId: true,
                },
            },
        },
    });

    // Query for overdue tasks: due date has passed
    // Requirement 4.2: Exclude tasks in Done status
    const overdueTasks = await prismaClient.task.findMany({
        where: {
            dueDate: {
                lte: now, // Due date has passed
            },
            OR: [
                { status: null },           // No status set
                { status: { not: DONE_STATUS } } // Not in Done status
            ]
        },
        include: {
            taskAssignments: {
                select: {
                    userId: true,
                },
            },
        },
    });

    // Process near-overdue tasks
    // Requirement 3.1: Create Info severity notification for each assignee
    for (const task of nearOverdueTasks) {
        for (const assignment of task.taskAssignments) {
            // Requirement 3.4: Check for existing notification to prevent duplicates
            const existingNotification = await prismaClient.notification.findFirst({
                where: {
                    userId: assignment.userId,
                    taskId: task.id,
                    type: NotificationType.NEAR_OVERDUE,
                },
            });

            if (!existingNotification) {
                // Requirement 3.3: Reference the associated task
                await createNotification({
                    userId: assignment.userId,
                    type: NotificationType.NEAR_OVERDUE,
                    severity: NotificationSeverity.INFO,
                    taskId: task.id,
                    message: `Task "${task.title}" is due within 24 hours`,
                });
            }
        }
    }

    // Process overdue tasks
    // Requirement 4.1: Create Critical severity notification for each assignee
    for (const task of overdueTasks) {
        for (const assignment of task.taskAssignments) {
            // Requirement 4.4: Check for existing notification to prevent duplicates
            const existingNotification = await prismaClient.notification.findFirst({
                where: {
                    userId: assignment.userId,
                    taskId: task.id,
                    type: NotificationType.OVERDUE,
                },
            });

            if (!existingNotification) {
                // Requirement 4.3: Reference the associated task
                await createNotification({
                    userId: assignment.userId,
                    type: NotificationType.OVERDUE,
                    severity: NotificationSeverity.CRITICAL,
                    taskId: task.id,
                    message: `Task "${task.title}" is overdue`,
                });
            }
        }
    }
}
