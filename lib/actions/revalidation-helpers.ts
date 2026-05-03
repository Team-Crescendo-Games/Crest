import { revalidatePath } from "next/cache";

/**
 * Revalidate task-related pages: the board page, the task detail page,
 * and the board list page.
 */
export function revalidateTask(
  workspaceId: string,
  boardId: string,
  taskId: string,
) {
  revalidatePath(`/w/${workspaceId}/b/${boardId}`);
  revalidatePath(`/w/${workspaceId}/b/${boardId}/t/${taskId}`);
  revalidatePath(`/w/${workspaceId}/b`);
}

/**
 * Revalidate sprint-related pages: the sprint list, the specific sprint
 * page (when sprintId is provided), and the workspace overview.
 */
export function revalidateSprint(
  workspaceId: string,
  sprintId?: string,
) {
  revalidatePath(`/w/${workspaceId}/s`);
  if (sprintId) {
    revalidatePath(`/w/${workspaceId}/s/${sprintId}`);
  }
  revalidatePath(`/w/${workspaceId}`);
}

/**
 * Revalidate workspace-level pages: the workspace overview and relevant
 * sub-pages (board list, team, settings).
 */
export function revalidateWorkspace(workspaceId: string) {
  revalidatePath(`/w/${workspaceId}`);
  revalidatePath(`/w/${workspaceId}/b`);
}

/**
 * Revalidate the dashboard layout.
 */
export function revalidateDashboard() {
  revalidatePath("/dashboard", "layout");
}
