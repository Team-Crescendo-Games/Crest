import type { Request, Response } from "express";
import { getPrismaClient } from "../lib/prisma.ts";

export const getProjects = async (_req: Request, res: Response) => {
    try {
        const projects = await getPrismaClient().project.findMany({
            orderBy: { displayOrder: "asc" },
        });
        res.json(projects);
    } catch (error: any) {
        console.error("Error fetching projects:", error.message);
        res.status(500).json({ error: "Failed to fetch projects: " + error.message });
    }
};

export const createProject = async (req: Request, res: Response) => {
    try {
        const { name, description } = req.body;
        const project = await getPrismaClient().project.create({
            data: { name, description },
        });
        res.status(201).json(project);
    } catch (error: any) {
        console.error("Error creating project:", error.message);
        res.status(500).json({ error: "Failed to create project: " + error.message });
    }
};

export const updateProject = async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const { name, description } = req.body;
        const project = await getPrismaClient().project.update({
            where: { id: Number(projectId) },
            data: { name, description },
        });
        res.json(project);
    } catch (error: any) {
        console.error("Error updating project:", error.message);
        res.status(500).json({ error: "Failed to update project: " + error.message });
    }
};

export const deleteProject = async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        await getPrismaClient().project.delete({
            where: { id: Number(projectId) },
        });
        res.status(204).send();
    } catch (error: any) {
        console.error("Error deleting project:", error.message);
        res.status(500).json({ error: "Failed to delete project: " + error.message });
    }
};

/**
 * Archive/unarchive a project (toggle isActive)
 * PATCH /projects/:projectId/archive
 */
export const archiveProject = async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const id = Number(projectId);

        if (isNaN(id)) {
            res.status(400).json({ error: "Invalid project ID" });
            return;
        }

        const existingProject = await getPrismaClient().project.findUnique({
            where: { id },
        });

        if (!existingProject) {
            res.status(404).json({ error: "Project not found" });
            return;
        }

        const project = await getPrismaClient().project.update({
            where: { id },
            data: { isActive: !existingProject.isActive },
        });

        res.json(project);
    } catch (error: any) {
        console.error("Error archiving project:", error.message);
        res.status(500).json({ error: "Failed to archive project: " + error.message });
    }
};


/**
 * Reorder projects
 * PATCH /projects/reorder
 */
export const reorderProjects = async (req: Request, res: Response) => {
    try {
        const { orderedIds } = req.body;

        if (!Array.isArray(orderedIds)) {
            res.status(400).json({ error: "orderedIds must be an array" });
            return;
        }

        // Update each project's displayOrder based on its position in the array
        await getPrismaClient().$transaction(
            orderedIds.map((id: number, index: number) =>
                getPrismaClient().project.update({
                    where: { id },
                    data: { displayOrder: index },
                })
            )
        );

        const projects = await getPrismaClient().project.findMany({
            orderBy: { displayOrder: "asc" },
        });

        res.json(projects);
    } catch (error: any) {
        console.error("Error reordering projects:", error.message);
        res.status(500).json({ error: "Failed to reorder projects: " + error.message });
    }
};
