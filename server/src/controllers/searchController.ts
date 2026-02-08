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

// Status mapping: 0=Input Queue, 1=Work In Progress, 2=Review, 3=Done
const statusIntToString = (status: number | null): string | null => {
    const statusMap: Record<number, string> = {
        0: "Input Queue",
        1: "Work In Progress",
        2: "Review",
        3: "Done",
    };
    return status !== null ? statusMap[status] || null : null;
};

export const search = async (req: Request, res: Response): Promise<void> => {
  const { query, categories } = req.query;
  
  // Parse categories - default to all if not specified
  const categoryList = categories 
    ? (categories as string).split(',') 
    : ['tasks', 'boards', 'users', 'sprints'];
  
  try {
    const results: {
      tasks?: any[];
      projects?: any[];
      users?: any[];
      sprints?: any[];
    } = {};

    if (categoryList.includes('tasks')) {
      const tasks = await getPrismaClient().task.findMany({
        where: {
          OR: [
            { title: { contains: query as string, mode: "insensitive" } },
            { description: { contains: query as string, mode: "insensitive" } },
          ],
        },
        include: {
          author: true,
          comments: true,
          attachments: true,
          taskTags: {
            include: {
              tag: true,
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
        },
      });
      // Map integer status to string for frontend
      results.tasks = tasks.map(task => ({
        ...task,
        status: statusIntToString(task.status),
      }));
    }

    if (categoryList.includes('boards')) {
      results.projects = await getPrismaClient().project.findMany({
        where: {
          OR: [
            { name: { contains: query as string, mode: "insensitive" } },
            { description: { contains: query as string, mode: "insensitive" } },
          ],
        },
      });
    }

    if (categoryList.includes('users')) {
      results.users = await getPrismaClient().user.findMany({
        where: {
          OR: [{ username: { contains: query as string, mode: "insensitive" } }],
        },
      });
    }

    if (categoryList.includes('sprints')) {
      results.sprints = await getPrismaClient().sprint.findMany({
        where: {
          title: { contains: query as string, mode: "insensitive" },
        },
        include: {
          _count: {
            select: { sprintTasks: true },
          },
        },
      });
    }
    
    res.json(results);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error performing search: ${error.message}` });
  }
};
