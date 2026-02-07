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
    
    if (!cognitoId || typeof cognitoId !== 'string') {
        res.status(400).json({ message: 'Invalid cognitoId parameter' });
        return;
    }
    
    try {
        let user = await getPrismaClient().user.findUnique({
            where: {
                cognitoId: cognitoId,
            },
        });

        // Auto-create user if they don't exist (for local dev without Lambda trigger)
        if (!user) {
            user = await getPrismaClient().user.create({
                data: {
                    cognitoId: cognitoId,
                    username: `user_${cognitoId.substring(0, 8)}`,
                    profilePictureExt: "jpg",
                },
            });
        }

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
        } = req.body;
        const newUser = await getPrismaClient().user.create({
            data: {
                username,
                cognitoId,
                profilePictureExt: "jpg",
            },
        });
        res.json({ message: "User Created Successfully", newUser });
    } catch (error: any) {
        res
            .status(500)
            .json({ message: `Error creating user: ${error.message}` });
    }
};
