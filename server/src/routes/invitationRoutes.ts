import { Router } from "express";
import {
    createInvitation,
    getInvitations,
    deleteInvitation,
    joinByInvitation,
} from "../controllers/invitationController.ts";
import { requirePermission } from "../middleware/permissionMiddleware.ts";
import { PERMISSIONS } from "../lib/permissions.ts";

// Nested under /workspaces/:workspaceId/invitations
const workspaceInvitationRouter = Router({ mergeParams: true });

workspaceInvitationRouter.get("/", requirePermission(PERMISSIONS.INVITE), getInvitations);
workspaceInvitationRouter.post("/", requirePermission(PERMISSIONS.INVITE), createInvitation);
workspaceInvitationRouter.delete(
    "/:invitationId",
    requirePermission(PERMISSIONS.INVITE),
    deleteInvitation
);

// Standalone: /invitations/:invitationId/join (no workspace permission needed)
const joinRouter = Router();
joinRouter.post("/:invitationId/join", joinByInvitation);

export { workspaceInvitationRouter, joinRouter };
