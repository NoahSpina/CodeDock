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
import { CODING_PROMPTS } from "../data/prompts.js";
import { setRoomPrompt, getRoomById, setCreatorSocketId } from "../data/roomStore.js";

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

            const room = getRoomById(roomId);

            if (room && !room.creatorSocketId) {
                setCreatorSocketId(roomId, socket.id);
            }

            const isCreator = getRoomById(roomId)?.creatorSocketId === socket.id;

            if (room?.selectedPromptId) {
                const prompt = CODING_PROMPTS.find(
                    (p: { id: string }) => p.id === room.selectedPromptId
                ) ?? null;
                socket.emit("prompt:updated", {
                    promptId: room.selectedPromptId,
                    prompt,
                });
            }

            socket.emit("room:joined", { isCreator });

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

        socket.on("prompt:select", ({ roomId, promptId }: { roomId: string; promptId: string }) => {
            const room = getRoomById(roomId);
            if (room?.creatorSocketId !== socket.id) return;

            const prompt = CODING_PROMPTS.find(
                (p: { id: string }) => p.id === promptId
            ) ?? null;
            if (!prompt) return;

            setRoomPrompt(roomId, promptId);
            io.to(roomId).emit("prompt:updated", { promptId, prompt });
        });

        socket.on("prompt:clear", ({ roomId }: { roomId: string }) => {
            const room = getRoomById(roomId);
            if (room?.creatorSocketId !== socket.id) return;
            setRoomPrompt(roomId, null);
            io.to(roomId).emit("prompt:updated", { promptId: null, prompt: null });
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
