import { revalidatePath } from "next/cache";

export function revalidateTask(workspaceId: string, boardId: string, taskId: string) {
  revalidatePath(`/w/${workspaceId}/b/${boardId}`);
  revalidatePath(`/w/${workspaceId}/b/${boardId}/t/${taskId}`);
  revalidatePath(`/w/${workspaceId}/b`);
}

export function revalidateSprint(workspaceId: string, sprintId?: string) {
  revalidatePath(`/w/${workspaceId}/s`);
  if (sprintId) {
    revalidatePath(`/w/${workspaceId}/s/${sprintId}`);
  }
  revalidatePath(`/w/${workspaceId}`);
}

export function revalidateWorkspace(workspaceId: string) {
  revalidatePath(`/w/${workspaceId}`);
  revalidatePath(`/w/${workspaceId}/b`);
}

export function revalidateDashboard() {
  revalidatePath("/dashboard", "layout");
}
