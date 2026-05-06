import type { Server as SocketIOServer, Socket } from "socket.io";
import jwt from "jsonwebtoken";
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
import { CODING_PROMPTS } from "../data/prompts.js";
import { Room } from "../models/Room.js";

interface SocketData {
    userId: string;
    username: string;
}

type CodeDockSocketServer = SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    {},
    SocketData
>;

type CodeDockSocket = Socket<
    ClientToServerEvents,
    ServerToClientEvents,
    {},
    SocketData
>;

export function registerSocketHandlers(io: CodeDockSocketServer) {
    io.use((socket, next) => {
        const token = socket.handshake.auth.token as string | undefined;
        if (!token) {
            return next(new Error("Authentication required"));
        }
        try {
            const secret = process.env.JWT_SECRET || "change-me";
            const payload = jwt.verify(token, secret) as {
                userId: string;
                username: string;
            };
            socket.data.userId = payload.userId;
            socket.data.username = payload.username;
            next();
        } catch {
            next(new Error("Invalid token"));
        }
    });

    io.on("connection", (socket: CodeDockSocket) => {
        console.log(`Socket connected: ${socket.id} (${socket.data.username})`);

        socket.on("room:join", async ({ roomId }: JoinRoomPayload) => {
            const username = socket.data.username || "Anonymous";

            socket.join(roomId);
            addParticipant(roomId, { socketId: socket.id, username });
            io.to(roomId).emit("room:participants", getParticipants(roomId));

            try {
                const room = await Room.findOne({ roomId });
                if (!room) return;

                const isCreator =
                    room.createdBy.toString() === socket.data.userId;

                if (isCreator && room.creatorSocketId !== socket.id) {
                    room.creatorSocketId = socket.id;
                    await room.save();
                }

                if (room.selectedPromptId) {
                    const prompt =
                        CODING_PROMPTS.find(
                            (p: { id: string }) =>
                                p.id === room.selectedPromptId
                        ) ?? null;
                    socket.emit("prompt:updated", {
                        promptId: room.selectedPromptId,
                        prompt,
                    });
                }

                socket.emit("room:joined", { isCreator });
            } catch (err) {
                console.error("room:join error", err);
            }
        });

        socket.on(
            "room:chat-message",
            ({ roomId, message }: ChatMessagePayload) => {
                const trimmedMessage = message?.trim();

                if (!roomId || !trimmedMessage) return;

                io.to(roomId).emit("room:chat-message", {
                    socketId: socket.id,
                    username: socket.data.username || "Anonymous",
                    message: trimmedMessage,
                    sentAt: new Date().toISOString(),
                });
            }
        );

        socket.on("room:code-change", ({ roomId, code }: CodeChangePayload) => {
            if (!roomId) return;
            socket.to(roomId).emit("room:code-change", { code });
        });

        socket.on(
            "prompt:select",
            async ({ roomId, promptId }: { roomId: string; promptId: string }) => {
                try {
                    const room = await Room.findOne({ roomId });
                    if (!room) return;
                    if (room.createdBy.toString() !== socket.data.userId) return;

                    const prompt =
                        CODING_PROMPTS.find(
                            (p: { id: string }) => p.id === promptId
                        ) ?? null;
                    if (!prompt) return;

                    room.selectedPromptId = promptId;
                    await room.save();

                    io.to(roomId).emit("prompt:updated", { promptId, prompt });
                } catch (err) {
                    console.error("prompt:select error", err);
                }
            }
        );

        socket.on(
            "prompt:clear",
            async ({ roomId }: { roomId: string }) => {
                try {
                    const room = await Room.findOne({ roomId });
                    if (!room) return;
                    if (room.createdBy.toString() !== socket.data.userId) return;

                    room.selectedPromptId = null;
                    await room.save();

                    io.to(roomId).emit("prompt:updated", {
                        promptId: null,
                        prompt: null,
                    });
                } catch (err) {
                    console.error("prompt:clear error", err);
                }
            }
        );

        socket.on("disconnect", () => {
            console.log(`Socket disconnected: ${socket.id}`);
            const roomId = removeParticipant(socket.id);
            if (roomId) {
                io.to(roomId).emit("room:participants", getParticipants(roomId));
            }
        });
    });
}