"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuthUser } from "@/lib/useAuthUser";
import { useAppDispatch } from "@/app/redux";
import { showNotification } from "@/state";

export interface CollaboratorUser {
  cognitoId: string;
  userId: number;
  username: string;
  fullName: string;
  color: string;
  selectedTaskId: number | null;
}

interface TaskSelection {
  cognitoId: string;
  userId: number;
  taskId: number | null;
  color: string;
}

/**
 * Hook for real-time collaboration on board/sprint pages.
 * Manages WebSocket connection, presence, task selection, and update notifications.
 */
export function useCollaboration(room: string | null) {
  const socketRef = useRef<Socket | null>(null);
  const [collaborators, setCollaborators] = useState<CollaboratorUser[]>([]);
  const { data: authData } = useAuthUser();
  const dispatch = useAppDispatch();
  const roomRef = useRef(room);
  roomRef.current = room;

  const currentUser = authData?.userDetails;

  useEffect(() => {
    if (!room || !currentUser?.cognitoId) return;

    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
    const socket = io(apiBase, { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join-room", {
        room,
        user: {
          cognitoId: currentUser.cognitoId!,
          userId: currentUser.userId!,
          username: currentUser.username,
          fullName: currentUser.fullName || currentUser.username,
        },
      });
    });

    socket.on("room-users", (users: CollaboratorUser[]) => {
      // Deduplicate by cognitoId in case of race conditions
      const unique = Array.from(
        new Map(users.map((u) => [u.cognitoId, u])).values(),
      );
      setCollaborators(unique);
    });

    socket.on("user-joined", (user: CollaboratorUser) => {
      setCollaborators((prev) => {
        if (prev.some((u) => u.cognitoId === user.cognitoId)) return prev;
        return [...prev, user];
      });
    });

    socket.on("user-left", (data: { cognitoId: string }) => {
      setCollaborators((prev) => prev.filter((u) => u.cognitoId !== data.cognitoId));
    });

    socket.on("task-selected", (data: TaskSelection) => {
      setCollaborators((prev) =>
        prev.map((u) =>
          u.cognitoId === data.cognitoId
            ? { ...u, selectedTaskId: data.taskId, color: data.color }
            : u,
        ),
      );
    });

    socket.on("task-changed", (data: { taskId: number; updatedBy: string }) => {
      const label = roomRef.current?.startsWith("sprint-") ? "Sprint" : "Board";
      dispatch(
        showNotification({
          message: `${label} Updated by ${data.updatedBy}`,
          type: "success",
        }),
      );
    });

    return () => {
      socket.emit("leave-room");
      socket.disconnect();
      socketRef.current = null;
      setCollaborators([]);
    };
  }, [room, currentUser?.cognitoId, currentUser?.userId, currentUser?.username, currentUser?.fullName, dispatch]);

  const selectTask = useCallback((taskId: number | null) => {
    socketRef.current?.emit("select-task", taskId);
  }, []);

  const notifyTaskUpdate = useCallback((taskId: number) => {
    if (roomRef.current) {
      socketRef.current?.emit("task-updated", { room: roomRef.current, taskId });
    }
  }, []);

  /** Map of taskId -> collaborator border color (for tasks selected by others) */
  const taskSelectionMap = new Map<number, string>();
  for (const c of collaborators) {
    if (c.selectedTaskId !== null) {
      taskSelectionMap.set(c.selectedTaskId, c.color);
    }
  }

  return {
    collaborators,
    taskSelectionMap,
    selectTask,
    notifyTaskUpdate,
  };
}
