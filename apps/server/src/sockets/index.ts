import type { Server as SocketIOServer, Socket } from "socket.io";
import {
    addParticipant,
    removeParticipant,
    getParticipants,
} from "./presenceStore.js";

type JoinRoomPayload = {
    roomId: string;
    username: string;
};

export function registerSocketHandlers(io: SocketIOServer) {
    io.on("connection", (socket: Socket) => {
        console.log(`Socket connected: ${socket.id}`);

        socket.on("room:join", ({ roomId, username }: JoinRoomPayload) => {
            socket.join(roomId);

            addParticipant(roomId, {
                socketId: socket.id,
                username: username?.trim() || "Anonymous",
            });

            io.to(roomId).emit("room:participants", getParticipants(roomId));
        });

        socket.on("disconnect", () => {
            console.log(`Socket disconnected: ${socket.id}`);

            const roomId = removeParticipant(socket.id);

            if (roomId) {
                io.to(roomId).emit("room:participants", getParticipants(roomId));
            }
        });
    });
}