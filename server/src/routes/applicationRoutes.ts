import { Router } from "express";
import {
    getDiscoverableWorkspaces,
    applyToWorkspace,
    getWorkspaceApplications,
    resolveApplication,
} from "../controllers/applicationController.ts";
import { requirePermission } from "../middleware/permissionMiddleware.ts";
import { PERMISSIONS } from "../lib/permissions.ts";

const router = Router();

// Public: get discoverable workspaces
router.get("/discover", getDiscoverableWorkspaces);

// Public: apply to join a workspace
router.post("/:workspaceId/apply", applyToWorkspace);

// Protected: get applications for a workspace
router.get(
    "/:workspaceId/applications",
    requirePermission(PERMISSIONS.MANAGE_APPLICATIONS),
    getWorkspaceApplications
);

// Protected: approve/reject an application
router.patch(
    "/:workspaceId/applications/:applicationId",
    requirePermission(PERMISSIONS.MANAGE_APPLICATIONS),
    resolveApplication
);

export default router;
