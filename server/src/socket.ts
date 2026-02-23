import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";

// Random colors assigned to users when they join a session
const COLLABORATOR_COLORS = [
    "#3b82f6",
    "#ef4444",
    "#10b981",
    "#f59e0b",
    "#8b5cf6",
    "#ec4899",
    "#06b6d4",
    "#f97316",
    "#14b8a6",
    "#6366f1",
];

interface PresenceUser {
    cognitoId: string;
    userId: number;
    username: string;
    fullName: string;
    color: string;
    selectedTaskId: number | null;
}

// room -> Map<socketId, PresenceUser>
const rooms = new Map<string, Map<string, PresenceUser>>();
let colorIndex = 0;

function getNextColor(): string {
    const color = COLLABORATOR_COLORS[colorIndex % COLLABORATOR_COLORS.length] ?? "#3b82f6";
    colorIndex++;
    return color;
}

export function initSocket(httpServer: HttpServer): Server {
    const io = new Server(httpServer, {
        cors: { origin: "*", methods: ["GET", "POST"] },
    });

    io.on("connection", (socket: Socket) => {
        let currentRoom: string | null = null;

        socket.on(
            "join-room",
            (data: { room: string; user: Omit<PresenceUser, "color" | "selectedTaskId"> }) => {
                const { room, user } = data;

                // Leave previous room if any
                if (currentRoom) {
                    leaveRoom(socket, currentRoom, io);
                }

                currentRoom = room;
                socket.join(room);

                if (!rooms.has(room)) {
                    rooms.set(room, new Map());
                }

                const presenceUser: PresenceUser = {
                    ...user,
                    color: getNextColor(),
                    selectedTaskId: null,
                };

                rooms.get(room)!.set(socket.id, presenceUser);

                // Send current room users to the joining user
                socket.emit("room-users", getUsersInRoom(room, socket.id));

                // Notify others that a new user joined
                socket.to(room).emit("user-joined", presenceUser);
            }
        );

        socket.on("select-task", (taskId: number | null) => {
            if (!currentRoom) return;
            const roomUsers = rooms.get(currentRoom);
            const user = roomUsers?.get(socket.id);
            if (!user) return;

            user.selectedTaskId = taskId;
            socket.to(currentRoom).emit("task-selected", {
                cognitoId: user.cognitoId,
                userId: user.userId,
                taskId,
                color: user.color,
            });
        });

        socket.on("task-updated", (data: { room: string; taskId: number }) => {
            if (!currentRoom) return;
            const user = rooms.get(currentRoom)?.get(socket.id);
            if (!user) return;

            // Broadcast to everyone else in the room
            socket.to(currentRoom).emit("task-changed", {
                taskId: data.taskId,
                updatedBy: user.fullName,
            });
        });

        socket.on("leave-room", () => {
            if (currentRoom) {
                leaveRoom(socket, currentRoom, io);
                currentRoom = null;
            }
        });

        socket.on("disconnect", () => {
            if (currentRoom) {
                leaveRoom(socket, currentRoom, io);
            }
        });
    });

    return io;
}

function leaveRoom(socket: Socket, room: string, io: Server) {
    const roomUsers = rooms.get(room);
    if (!roomUsers) return;

    const user = roomUsers.get(socket.id);
    roomUsers.delete(socket.id);
    socket.leave(room);

    if (roomUsers.size === 0) {
        rooms.delete(room);
    } else if (user) {
        io.to(room).emit("user-left", { cognitoId: user.cognitoId, userId: user.userId });
    }
}

function getUsersInRoom(room: string, excludeSocketId: string): PresenceUser[] {
    const roomUsers = rooms.get(room);
    if (!roomUsers) return [];
    return Array.from(roomUsers.entries())
        .filter(([id]) => id !== excludeSocketId)
        .map(([, user]) => user);
}
