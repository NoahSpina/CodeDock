import type { Server as SocketIOServer, Socket } from "socket.io";
import type {
    ChatMessagePayload,
    ClientToServerEvents,
    CodeChangePayload,
    JoinRoomPayload,
    ServerToClientEvents,
} from "@codedock/shared";
import {
    addParticipant,
    removeParticipant,
    getParticipants,
} from "./presenceStore.js";

type CodeDockSocketServer = SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents
>;

type CodeDockSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export function registerSocketHandlers(io: CodeDockSocketServer) {
    io.on("connection", (socket: CodeDockSocket) => {
        console.log(`Socket connected: ${socket.id}`);

        socket.on("room:join", ({ roomId, username }: JoinRoomPayload) => {
            socket.join(roomId);

            addParticipant(roomId, {
                socketId: socket.id,
                username: username?.trim() || "Anonymous",
            });

            io.to(roomId).emit("room:participants", getParticipants(roomId));
        });

        socket.on(
            "room:chat-message",
            ({ roomId, username, message }: ChatMessagePayload) => {
                const trimmedMessage = message?.trim();

                if (!roomId || !trimmedMessage) {
                    return;
                }

                io.to(roomId).emit("room:chat-message", {
                    socketId: socket.id,
                    username: username?.trim() || "Anonymous",
                    message: trimmedMessage,
                    sentAt: new Date().toISOString(),
                });
            },
        );

        socket.on("room:code-change", ({ roomId, code }: CodeChangePayload) => {
            if (!roomId) {
                return;
            }

            socket.to(roomId).emit("room:code-change", {
                code,
            });
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
