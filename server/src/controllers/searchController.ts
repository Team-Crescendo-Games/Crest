import type { Request, Response } from "express";
import { getPrismaClient } from "../lib/prisma.ts";
import { statusIntToString } from "../lib/statusUtils.ts";

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
