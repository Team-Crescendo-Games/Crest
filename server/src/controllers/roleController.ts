import type { Request, Response } from "express";
import { getPrismaClient } from "../lib/prisma.ts";

/**
 * List all roles for a workspace
 */
export const getRoles = async (req: Request, res: Response): Promise<void> => {
    try {
        const { workspaceId } = req.params;

        const roles = await getPrismaClient().role.findMany({
            where: { workspaceId: Number(workspaceId) },
        });

        res.json(roles);
    } catch (error: any) {
        res.status(500).json({ error: `Error retrieving roles: ${error.message}` });
    }
};

/**
 * Create a new role in a workspace
 */
export const createRole = async (req: Request, res: Response): Promise<void> => {
    try {
        const { workspaceId } = req.params;
        const { name, color, permissions } = req.body;

        const role = await getPrismaClient().role.create({
            data: {
                name,
                color: color || "#6B7280",
                permissions: permissions ?? 0,
                workspaceId: Number(workspaceId),
            },
        });

        res.status(201).json(role);
    } catch (error: any) {
        if (error.code === "P2002") {
            res.status(400).json({ error: "A role with this name already exists" });
            return;
        }
        res.status(500).json({ error: `Error creating role: ${error.message}` });
    }
};

/**
 * Update a role's fields (name, color, permissions).
 * Prevents renaming or modifying the default Admin role name.
 */
export const updateRole = async (req: Request, res: Response): Promise<void> => {
    try {
        const { workspaceId, roleId } = req.params;
        const { name, color, permissions } = req.body;

        const prisma = getPrismaClient();

        const existingRole = await prisma.role.findFirst({
            where: { id: Number(roleId), workspaceId: Number(workspaceId) },
        });

        if (!existingRole) {
            res.status(404).json({ error: "Role not found" });
            return;
        }

        if (existingRole.name === "Admin" || existingRole.name === "Member") {
            res.status(400).json({ error: `Cannot modify or delete the default ${existingRole.name} role` });
            return;
        }

        // Check for duplicate name if renaming
        if (name !== undefined && name !== existingRole.name) {
            const duplicate = await prisma.role.findUnique({
                where: { workspaceId_name: { workspaceId: Number(workspaceId), name } },
            });
            if (duplicate) {
                res.status(400).json({ error: "A role with this name already exists" });
                return;
            }
        }

        const updatedRole = await prisma.role.update({
            where: { id: Number(roleId) },
            data: {
                ...(name !== undefined && { name }),
                ...(color !== undefined && { color }),
                ...(permissions !== undefined && { permissions }),
            },
        });

        res.json(updatedRole);
    } catch (error: any) {
        res.status(500).json({ error: `Error updating role: ${error.message}` });
    }
};

/**
 * Delete a role. Prevents deletion if members are assigned or if it's the Admin role.
 */
export const deleteRole = async (req: Request, res: Response): Promise<void> => {
    try {
        const { workspaceId, roleId } = req.params;

        const prisma = getPrismaClient();

        const role = await prisma.role.findFirst({
            where: { id: Number(roleId), workspaceId: Number(workspaceId) },
            include: { _count: { select: { members: true } } },
        });

        if (!role) {
            res.status(404).json({ error: "Role not found" });
            return;
        }

        if (role.name === "Admin" || role.name === "Member") {
            res.status(400).json({ error: `Cannot modify or delete the default ${role.name} role` });
            return;
        }

        if (role._count.members > 0) {
            res.status(400).json({ error: "Cannot delete role: members are still assigned" });
            return;
        }

        await prisma.role.delete({
            where: { id: Number(roleId) },
        });

        res.status(204).send();
    } catch (error: any) {
        res.status(500).json({ error: `Error deleting role: ${error.message}` });
    }
};
