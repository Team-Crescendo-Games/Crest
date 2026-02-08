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

/**
 * Get all sprints with task counts
 * GET /sprints
 */
export const getSprints = async (_req: Request, res: Response) => {
  try {
    const sprints = await getPrismaClient().sprint.findMany({
      include: {
        _count: {
          select: { sprintTasks: true }
        }
      }
    });
    res.json(sprints);
  } catch (error: any) {
    console.error("Error fetching sprints:", error.message);
    res.status(500).json({ error: "Failed to fetch sprints: " + error.message });
  }
};

/**
 * Get a single sprint with associated tasks
 * GET /sprints/:sprintId
 */
export const getSprint = async (req: Request, res: Response) => {
  try {
    const { sprintId } = req.params;
    const id = Number(sprintId);
    
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid sprint ID" });
      return;
    }

    const sprint = await getPrismaClient().sprint.findUnique({
      where: { id },
      include: {
        sprintTasks: {
          include: {
            task: {
              include: {
                author: true,
                assignee: true,
                comments: {
                  orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
                  include: {
                    user: true,
                    reactions: {
                      include: {
                        user: {
                          select: { userId: true, username: true },
                        },
                      },
                    },
                  },
                },
                attachments: true,
                activities: {
                  include: {
                    user: {
                      select: { userId: true, username: true, profilePictureExt: true },
                    },
                  },
                  orderBy: { createdAt: 'desc' },
                },
                taskTags: {
                  include: {
                    tag: true
                  }
                },
                subtasks: {
                  select: {
                    id: true,
                    title: true,
                    status: true,
                    priority: true,
                    assignee: { select: { userId: true, username: true, profilePictureExt: true } },
                  },
                },
                parentTask: {
                  select: { id: true, title: true },
                },
                sprintTasks: {
                  include: {
                    sprint: {
                      select: { id: true, title: true }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!sprint) {
      res.status(404).json({ error: "Sprint not found" });
      return;
    }

    // Transform the response to include tasks directly with string status and sprints
    const response = {
      ...sprint,
      tasks: sprint.sprintTasks.map(st => ({
        ...st.task,
        status: statusIntToString(st.task.status),
        subtasks: st.task.subtasks?.map(subtask => ({
          ...subtask,
          status: statusIntToString(subtask.status),
        })),
        sprints: st.task.sprintTasks?.map(sprintTask => sprintTask.sprint),
      }))
    };

    res.json(response);
  } catch (error: any) {
    console.error("Error fetching sprint:", error.message);
    res.status(500).json({ error: "Failed to fetch sprint: " + error.message });
  }
};

/**
 * Create a new sprint
 * POST /sprints
 * Body: { title: string, startDate?: string, dueDate?: string }
 */
export const createSprint = async (req: Request, res: Response) => {
  try {
    const { title, startDate, dueDate } = req.body;

    // Validate required title
    if (!title || (typeof title === 'string' && title.trim() === '')) {
      res.status(400).json({ error: "Title is required" });
      return;
    }

    const sprint = await getPrismaClient().sprint.create({
      data: {
        title: title.trim(),
        startDate: startDate ? new Date(startDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null
      }
    });

    res.status(201).json(sprint);
  } catch (error: any) {
    console.error("Error creating sprint:", error.message);
    res.status(500).json({ error: "Failed to create sprint: " + error.message });
  }
};

/**
 * Update an existing sprint
 * PATCH /sprints/:sprintId
 * Body: { title?: string, startDate?: string, dueDate?: string }
 */
export const updateSprint = async (req: Request, res: Response) => {
  try {
    const { sprintId } = req.params;
    const { title, startDate, dueDate } = req.body;
    const id = Number(sprintId);

    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid sprint ID" });
      return;
    }

    // Check if sprint exists
    const existingSprint = await getPrismaClient().sprint.findUnique({
      where: { id }
    });

    if (!existingSprint) {
      res.status(404).json({ error: "Sprint not found" });
      return;
    }

    // Validate title if provided
    if (title !== undefined && (typeof title !== 'string' || title.trim() === '')) {
      res.status(400).json({ error: "Title is required" });
      return;
    }

    // Build update data
    const updateData: {
      title?: string;
      startDate?: Date | null;
      dueDate?: Date | null;
    } = {};

    if (title !== undefined) {
      updateData.title = title.trim();
    }
    if (startDate !== undefined) {
      updateData.startDate = startDate ? new Date(startDate) : null;
    }
    if (dueDate !== undefined) {
      updateData.dueDate = dueDate ? new Date(dueDate) : null;
    }

    const sprint = await getPrismaClient().sprint.update({
      where: { id },
      data: updateData
    });

    res.json(sprint);
  } catch (error: any) {
    console.error("Error updating sprint:", error.message);
    res.status(500).json({ error: "Failed to update sprint: " + error.message });
  }
};

/**
 * Delete a sprint
 * DELETE /sprints/:sprintId
 */
export const deleteSprint = async (req: Request, res: Response) => {
  try {
    const { sprintId } = req.params;
    const id = Number(sprintId);

    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid sprint ID" });
      return;
    }

    // Check if sprint exists
    const existingSprint = await getPrismaClient().sprint.findUnique({
      where: { id }
    });

    if (!existingSprint) {
      res.status(404).json({ error: "Sprint not found" });
      return;
    }

    // Delete sprint (cascade will handle SprintTask records)
    await getPrismaClient().sprint.delete({
      where: { id }
    });

    res.status(204).send();
  } catch (error: any) {
    console.error("Error deleting sprint:", error.message);
    res.status(500).json({ error: "Failed to delete sprint: " + error.message });
  }
};

/**
 * Add a task to a sprint (idempotent - no error if already exists)
 * POST /sprints/:sprintId/tasks/:taskId
 */
export const addTaskToSprint = async (req: Request, res: Response) => {
  try {
    const { sprintId, taskId } = req.params;
    const sprintIdNum = Number(sprintId);
    const taskIdNum = Number(taskId);

    // Validate sprint ID format
    if (isNaN(sprintIdNum)) {
      res.status(400).json({ error: "Invalid sprint ID" });
      return;
    }

    // Validate task ID format
    if (isNaN(taskIdNum)) {
      res.status(400).json({ error: "Invalid task ID" });
      return;
    }

    // Check if sprint exists
    const sprint = await getPrismaClient().sprint.findUnique({
      where: { id: sprintIdNum }
    });

    if (!sprint) {
      res.status(404).json({ error: "Sprint not found" });
      return;
    }

    // Check if task exists
    const task = await getPrismaClient().task.findUnique({
      where: { id: taskIdNum }
    });

    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    // Check if association already exists (for idempotency)
    const existingAssociation = await getPrismaClient().sprintTask.findUnique({
      where: {
        sprintId_taskId: {
          sprintId: sprintIdNum,
          taskId: taskIdNum
        }
      }
    });

    if (existingAssociation) {
      // Idempotent: return success without creating duplicate
      res.status(200).json(existingAssociation);
      return;
    }

    // Create the association
    const sprintTask = await getPrismaClient().sprintTask.create({
      data: {
        sprintId: sprintIdNum,
        taskId: taskIdNum
      }
    });

    res.status(201).json(sprintTask);
  } catch (error: any) {
    console.error("Error adding task to sprint:", error.message);
    res.status(500).json({ error: "Failed to add task to sprint: " + error.message });
  }
};

/**
 * Remove a task from a sprint
 * DELETE /sprints/:sprintId/tasks/:taskId
 */
export const removeTaskFromSprint = async (req: Request, res: Response) => {
  try {
    const { sprintId, taskId } = req.params;
    const sprintIdNum = Number(sprintId);
    const taskIdNum = Number(taskId);

    // Validate sprint ID format
    if (isNaN(sprintIdNum)) {
      res.status(400).json({ error: "Invalid sprint ID" });
      return;
    }

    // Validate task ID format
    if (isNaN(taskIdNum)) {
      res.status(400).json({ error: "Invalid task ID" });
      return;
    }

    // Check if sprint exists
    const sprint = await getPrismaClient().sprint.findUnique({
      where: { id: sprintIdNum }
    });

    if (!sprint) {
      res.status(404).json({ error: "Sprint not found" });
      return;
    }

    // Check if task exists
    const task = await getPrismaClient().task.findUnique({
      where: { id: taskIdNum }
    });

    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    // Delete the association (if it exists)
    await getPrismaClient().sprintTask.deleteMany({
      where: {
        sprintId: sprintIdNum,
        taskId: taskIdNum
      }
    });

    res.status(204).send();
  } catch (error: any) {
    console.error("Error removing task from sprint:", error.message);
    res.status(500).json({ error: "Failed to remove task from sprint: " + error.message });
  }
};

/**
 * Archive/unarchive a sprint (toggle isActive)
 * PATCH /sprints/:sprintId/archive
 */
export const archiveSprint = async (req: Request, res: Response) => {
  try {
    const { sprintId } = req.params;
    const id = Number(sprintId);

    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid sprint ID" });
      return;
    }

    // Get current sprint
    const existingSprint = await getPrismaClient().sprint.findUnique({
      where: { id }
    });

    if (!existingSprint) {
      res.status(404).json({ error: "Sprint not found" });
      return;
    }

    // Toggle isActive
    const sprint = await getPrismaClient().sprint.update({
      where: { id },
      data: { isActive: !existingSprint.isActive }
    });

    res.json(sprint);
  } catch (error: any) {
    console.error("Error archiving sprint:", error.message);
    res.status(500).json({ error: "Failed to archive sprint: " + error.message });
  }
};

/**
 * Duplicate a sprint with all its tasks
 * POST /sprints/:sprintId/duplicate
 * Body: { title?: string, includeFinishedTasks?: boolean } - optional new title, defaults to "Copy of {original title}"
 * includeFinishedTasks defaults to false (only migrate non-Done tasks)
 */
export const duplicateSprint = async (req: Request, res: Response) => {
  try {
    const { sprintId } = req.params;
    const { title, includeFinishedTasks = false } = req.body;
    const id = Number(sprintId);

    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid sprint ID" });
      return;
    }

    // Get the original sprint with its tasks (including task status)
    const originalSprint = await getPrismaClient().sprint.findUnique({
      where: { id },
      include: {
        sprintTasks: {
          include: {
            task: {
              select: { id: true, status: true }
            }
          }
        }
      }
    });

    if (!originalSprint) {
      res.status(404).json({ error: "Sprint not found" });
      return;
    }

    // Create the new sprint
    const newTitle = title?.trim() || `Copy of ${originalSprint.title}`;
    const newSprint = await getPrismaClient().sprint.create({
      data: {
        title: newTitle,
        startDate: originalSprint.startDate,
        dueDate: originalSprint.dueDate
      }
    });

    // Filter tasks based on includeFinishedTasks flag
    // Status 3 = Done
    const tasksToMigrate = includeFinishedTasks
      ? originalSprint.sprintTasks
      : originalSprint.sprintTasks.filter(st => st.task.status !== 3);

    // Copy task associations to the new sprint
    if (tasksToMigrate.length > 0) {
      await getPrismaClient().sprintTask.createMany({
        data: tasksToMigrate.map(st => ({
          sprintId: newSprint.id,
          taskId: st.taskId
        }))
      });
    }

    // Return the new sprint with task count
    const result = await getPrismaClient().sprint.findUnique({
      where: { id: newSprint.id },
      include: {
        _count: {
          select: { sprintTasks: true }
        }
      }
    });

    res.status(201).json(result);
  } catch (error: any) {
    console.error("Error duplicating sprint:", error.message);
    res.status(500).json({ error: "Failed to duplicate sprint: " + error.message });
  }
};
