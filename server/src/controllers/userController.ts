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

export const getUsers = async (req: Request, res: Response): Promise<void> => {
    try {
        const users = await getPrismaClient().user.findMany();
        res.json(users);
    } catch (error: any) {
        res
            .status(500)
            .json({ message: `Error retrieving users: ${error.message}` });
    }
};

export const getUser = async (req: Request, res: Response): Promise<void> => {
    const { cognitoId } = req.params;
    try {
        const user = await getPrismaClient().user.findUnique({
            where: {
                cognitoId: String(cognitoId),
            },
        });

        res.json(user);
    } catch (error: any) {
        res
            .status(500)
            .json({ message: `Error retrieving user: ${error.message}` });
    }
};

export const postUser = async (req: Request, res: Response) => {
    try {
        const {
            username,
            cognitoId,
            profilePictureUrl = "i1.jpg",
            teamId = 1,
        } = req.body;
        const newUser = await getPrismaClient().user.create({
            data: {
                username,
                cognitoId,
                profilePictureUrl,
                teamId,
            },
        });
        res.json({ message: "User Created Successfully", newUser });
    } catch (error: any) {
        res
            .status(500)
            .json({ message: `Error retrieving users: ${error.message}` });
    }
};
