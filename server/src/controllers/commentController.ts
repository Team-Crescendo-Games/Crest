import type { Request, Response } from "express";
import { getPrismaClient } from "../lib/prisma.ts";
import { createMentionNotifications } from "../services/notificationService.ts";

export const createComment = async (req: Request, res: Response): Promise<void> => {
    const { taskId, userId, text } = req.body;

    // Validate required fields
    if (!taskId || !userId || !text) {
        res.status(400).json({
            error: `Missing required fields: taskId=${taskId}, userId=${userId}, text=${text ? "provided" : "missing"}`,
        });
        return;
    }

    const numericUserId = Number(userId);
    const numericTaskId = Number(taskId);

    if (isNaN(numericUserId) || isNaN(numericTaskId)) {
        res.status(400).json({
            error: `Invalid numeric values: taskId=${taskId}, userId=${userId}`,
        });
        return;
    }

    try {
        // Verify user exists
        const user = await getPrismaClient().user.findUnique({
            where: { userId: numericUserId },
        });

        if (!user) {
            res.status(404).json({ error: `User with id ${numericUserId} not found` });
            return;
        }

        const newComment = await getPrismaClient().comment.create({
            data: {
                taskId: numericTaskId,
                userId: numericUserId,
                text,
            },
            include: {
                user: true,
            },
        });

        // Create mention notifications for users mentioned in the comment
        // Wrapped in try-catch to not fail comment creation on notification error
        try {
            await createMentionNotifications(newComment.id, text, numericTaskId, numericUserId);
        } catch (error) {
            console.error("Failed to create mention notifications:", error);
            // Continue - don't fail the comment creation on notification error
        }

        res.status(201).json(newComment);
    } catch (error: any) {
        res.status(500).json({ error: `Error creating comment: ${error.message}` });
    }
};

export const toggleCommentResolved = async (req: Request, res: Response): Promise<void> => {
    const { commentId } = req.params;
    const numericCommentId = Number(commentId);

    if (isNaN(numericCommentId)) {
        res.status(400).json({ error: `Invalid comment id: ${commentId}` });
        return;
    }

    try {
        const comment = await getPrismaClient().comment.findUnique({
            where: { id: numericCommentId },
        });

        if (!comment) {
            res.status(404).json({ error: `Comment with id ${numericCommentId} not found` });
            return;
        }

        const updatedComment = await getPrismaClient().comment.update({
            where: { id: numericCommentId },
            data: { isResolved: !comment.isResolved },
            include: {
                user: true,
                reactions: {
                    include: { user: true },
                },
            },
        });

        res.json(updatedComment);
    } catch (error: any) {
        res.status(500).json({ error: `Error toggling comment resolved: ${error.message}` });
    }
};
