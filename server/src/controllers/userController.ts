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
            if (process.env.NODE_ENV === 'development') {
                // Use configured dev account details from environment
                const devUsername = process.env.DEV_ACCOUNT_NAME;
                const devEmail = process.env.DEV_ACCOUNT_EMAIL;
                
                if (!devUsername || !devEmail) {
                    res.status(500).json({ 
                        message: 'Dev account not configured. Set DEV_ACCOUNT_NAME and DEV_ACCOUNT_EMAIL in .env' 
                    });
                    return;
                }
                
                user = await getPrismaClient().user.create({
                    data: {
                        cognitoId: cognitoId,
                        username: devUsername,
                        email: devEmail,
                        profilePictureExt: "jpg",
                    },
                });
            } else {
                res.status(404).json({ message: 'User not found' });
                return;
            }
        }

        res.json(user);
    } catch (error: any) {
        res
            .status(500)
            .json({ message: `Error retrieving user: ${error.message}` });
    }
};

export const getUserById = async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params;
    const id = Number(userId);
    
    if (isNaN(id)) {
        res.status(400).json({ message: 'Invalid userId parameter' });
        return;
    }
    
    try {
        const user = await getPrismaClient().user.findUnique({
            where: { userId: id },
        });

        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        res.json(user);
    } catch (error: any) {
        res.status(500).json({ message: `Error retrieving user: ${error.message}` });
    }
};

export const postUser = async (req: Request, res: Response) => {
    try {
        const {
            username,
            cognitoId,
            email,
        } = req.body;
        const newUser = await getPrismaClient().user.create({
            data: {
                username,
                cognitoId,
                email,
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

export const updateUserProfilePicture = async (req: Request, res: Response): Promise<void> => {
    const { cognitoId } = req.params;
    const { profilePictureExt } = req.body;
    
    if (!cognitoId || typeof cognitoId !== 'string') {
        res.status(400).json({ message: 'Invalid cognitoId parameter' });
        return;
    }
    
    if (!profilePictureExt || typeof profilePictureExt !== 'string') {
        res.status(400).json({ message: 'Invalid profilePictureExt parameter' });
        return;
    }
    
    try {
        const user = await getPrismaClient().user.update({
            where: { cognitoId },
            data: { profilePictureExt },
        });
        res.json(user);
    } catch (error: any) {
        res.status(500).json({ message: `Error updating profile picture: ${error.message}` });
    }
};
