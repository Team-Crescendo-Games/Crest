import type { Request, Response } from "express";
import { getPrismaClient } from "../lib/prisma.ts";

// Valid emoji IDs from public/emojis library (Requirement 1.5)
const VALID_EMOJI_IDS = [
    "FeelingYes",
    "FeelingGreat",
    "FeelingCelebratory",
    "FeelingCaffeinated",
    "FeelingSad",
    "FeelingMad",
    "FeelingSlay",
    "FeelingMagical",
    "FeedlingInconceivablySad",
    "FeelingBleachyKeen",
    "FeelingChonkedUp",
    "FeelingChrisYearsOld",
    "FeelingColeYearsOld",
    "FeelingDead",
    "FeelingFurryGuilt",
    "FeelingHamsterHaha",
    "FeelingHamsterHappy",
    "FeelingHamsterHumiliated",
    "FeelingHankYearsOld",
    "FeelingLesbianAnguish",
    "FeelingLittleStupid",
    "FeelingMarkYearsOld",
    "FeelingMildlyDisappointed",
    "FeelingRed",
    "FeelingShady",
    "FeelingSleepy",
    "FeelingSubmissive",
    "FeelingYappy",
];

export const toggleReaction = async (req: Request, res: Response) => {
    try {
        const { commentId, userId, emoji } = req.body;

        // Validate emoji (Requirement 1.5)
        if (!VALID_EMOJI_IDS.includes(emoji)) {
            res.status(400).json({ error: "Invalid emoji" });
            return;
        }

        const db = getPrismaClient();

        // Check if comment exists
        const comment = await db.comment.findUnique({
            where: { id: commentId },
        });

        if (!comment) {
            res.status(404).json({ error: "Comment not found" });
            return;
        }

        // Check if reaction already exists
        const existingReaction = await db.commentReaction.findUnique({
            where: {
                commentId_userId_emoji: {
                    commentId,
                    userId,
                    emoji,
                },
            },
        });

        if (existingReaction) {
            // Remove reaction (toggle off)
            await db.commentReaction.delete({
                where: { id: existingReaction.id },
            });
            res.json(null);
        } else {
            // Add reaction (toggle on)
            const newReaction = await db.commentReaction.create({
                data: {
                    commentId,
                    userId,
                    emoji,
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
            res.json(newReaction);
        }
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getReactionsByComment = async (req: Request, res: Response) => {
    try {
        const { commentId } = req.params;
        const db = getPrismaClient();

        const reactions = await db.commentReaction.findMany({
            where: { commentId: parseInt(commentId as string) },
            include: {
                user: {
                    select: {
                        userId: true,
                        username: true,
                    },
                },
            },
        });

        res.json(reactions);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
