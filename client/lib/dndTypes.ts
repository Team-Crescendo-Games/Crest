// Shared drag-and-drop item types
export const DND_ITEM_TYPES = {
  TASK: "task",
  SIDEBAR_BOARD: "sidebar_board",
} as const;

export interface DraggedTask {
  id: number;
  projectId: number;
}

export interface DraggedSidebarBoard {
  id: number;
  index: number;
}
