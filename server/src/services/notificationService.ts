import type { Notification } from "../../prisma/generated/prisma/client.js";
import { getPrismaClient } from "../lib/prisma.ts";

export const NotificationType = {
    MENTION: 0,
    NEAR_OVERDUE: 1,
    OVERDUE: 2,
    TASK_EDITED: 3,
    TASK_REASSIGNED: 4,
} as const;

export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const NotificationSeverity = {
    INFO: 0,
    MEDIUM: 1,
    CRITICAL: 2,
} as const;

export type NotificationSeverity = (typeof NotificationSeverity)[keyof typeof NotificationSeverity];

export interface CreateNotificationParams {
    userId: number;
    type: NotificationType;
    severity: NotificationSeverity;
    taskId?: number;
    commentId?: number;
    activityId?: number;
    message?: string;
}

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
 */
export function parseMentions(text: string): string[] {
    if (!text) {
        return [];
    }

    const mentionRegex = /(?:^|[\s.,!?;:()\[\]{}])@(\w+)/g;

    const mentions: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = mentionRegex.exec(text)) !== null) {
        const username = match[1];
        if (username) {
            if (!mentions.some((m) => m.toLowerCase() === username.toLowerCase())) {
                mentions.push(username);
            }
        }
    }

    return mentions;
}

/**
 * Creates mention notifications for users mentioned in a comment.
 */
export async function createMentionNotifications(
    commentId: number,
    commentText: string,
    taskId: number,
    authorUserId: number
): Promise<void> {
    const mentionedUsernames = parseMentions(commentText);

    if (mentionedUsernames.length === 0) {
        return;
    }

    const prismaClient = getPrismaClient();

    const users = await prismaClient.user.findMany({
        where: {
            username: {
                in: mentionedUsernames,
                mode: "insensitive",
            },
        },
        select: {
            userId: true,
            username: true,
        },
    });

    for (const user of users) {
        if (user.userId === authorUserId) {
            continue;
        }

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
 */
export async function createTaskEditNotifications(
    taskId: number,
    activityId: number,
    excludeUserId: number
): Promise<void> {
    const prismaClient = getPrismaClient();

    const taskAssignments = await prismaClient.taskAssignment.findMany({
        where: {
            taskId: taskId,
        },
        select: {
            userId: true,
        },
    });

    for (const assignment of taskAssignments) {
        if (assignment.userId === excludeUserId) {
            continue;
        }

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
 */
export async function createReassignmentNotifications(
    taskId: number,
    addedUserIds: number[],
    removedUserIds: number[],
    changedByUserId: number
): Promise<void> {
    for (const userId of addedUserIds) {
        if (userId === changedByUserId) {
            continue;
        }

        await createNotification({
            userId: userId,
            type: NotificationType.TASK_REASSIGNED,
            severity: NotificationSeverity.INFO,
            taskId: taskId,
            message: `You have been assigned to a task`,
        });
    }

    for (const userId of removedUserIds) {
        if (userId === changedByUserId) {
            continue;
        }

        await createNotification({
            userId: userId,
            type: NotificationType.TASK_REASSIGNED,
            severity: NotificationSeverity.INFO,
            taskId: taskId,
            message: `You have been removed from a task`,
        });
    }
}

const DONE_STATUS = 3;

/**
 * Checks for tasks with approaching or past due dates and creates notifications.
 */
export async function checkAndCreateDueDateNotifications(): Promise<void> {
    const prismaClient = getPrismaClient();
    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const nearOverdueTasks = await prismaClient.task.findMany({
        where: {
            dueDate: {
                gt: now,
                lte: twentyFourHoursFromNow,
            },
            OR: [{ status: null }, { status: { not: DONE_STATUS } }],
        },
        include: {
            taskAssignments: {
                select: {
                    userId: true,
                },
            },
        },
    });

    const overdueTasks = await prismaClient.task.findMany({
        where: {
            dueDate: {
                lte: now,
            },
            OR: [{ status: null }, { status: { not: DONE_STATUS } }],
        },
        include: {
            taskAssignments: {
                select: {
                    userId: true,
                },
            },
        },
    });

    for (const task of nearOverdueTasks) {
        for (const assignment of task.taskAssignments) {
            const existingNotification = await prismaClient.notification.findFirst({
                where: {
                    userId: assignment.userId,
                    taskId: task.id,
                    type: NotificationType.NEAR_OVERDUE,
                },
            });

            if (!existingNotification) {
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

    for (const task of overdueTasks) {
        for (const assignment of task.taskAssignments) {
            const existingNotification = await prismaClient.notification.findFirst({
                where: {
                    userId: assignment.userId,
                    taskId: task.id,
                    type: NotificationType.OVERDUE,
                },
            });

            if (!existingNotification) {
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
