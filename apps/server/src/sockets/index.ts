import type { Server as SocketIOServer, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import type {
    ChatMessagePayload,
    ClientToServerEvents,
    CodeChangePayload,
    EndInterviewPayload,
    JoinRoomPayload,
    ServerToClientEvents,
    StdinChangePayload,
} from "@codedock/shared";
import {
    addParticipant,
    removeParticipant,
    getParticipants,
} from "./presenceStore.js";
import { CODING_PROMPTS } from "../data/prompts.js";
import {
    recordCodeChanged,
    recordParticipantJoined,
    recordPromptSelected,
    recordRoomStatus,
} from "../data/historyStore.js";
import { Room } from "../models/Room.js";
import {
    validateChatMessage,
    validateCode,
    validateGuestId,
    validatePromptId,
    validateRoomId,
    validateStdin,
} from "../validation.js";

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

function emitValidationError(
    socket: CodeDockSocket,
    event: string,
    err: unknown
) {
    socket.emit("room:validation-error", {
        event,
        message: typeof err === "string" ? err : "Invalid input",
    });
}

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

        socket.on("room:join", async ({ roomId, guestId }: JoinRoomPayload) => {
            let cleanRoomId: string;
            let cleanGuestId: string | undefined;
            try {
                cleanRoomId = validateRoomId(roomId);
                cleanGuestId = validateGuestId(guestId);
            } catch (err) {
                return emitValidationError(socket, "room:join", err);
            }

            const username = socket.data.username || "Anonymous";

            try {
                const room = await Room.findOne({ roomId: cleanRoomId });
                if (!room) return;

                socket.join(cleanRoomId);
                addParticipant(cleanRoomId, {
                    socketId: socket.id,
                    username,
                    guestId: cleanGuestId,
                });
                io.to(cleanRoomId).emit(
                    "room:participants",
                    getParticipants(cleanRoomId)
                );

                const isCreator = room.createdBy.toString() === socket.data.userId;

                if (isCreator && room.creatorSocketId !== socket.id) {
                    room.creatorSocketId = socket.id;
                    await room.save();
                }

                recordParticipantJoined(
                    {
                        roomId: room.roomId,
                        title: room.title,
                        inviteCode: room.inviteCode,
                        status: room.status,
                        createdAt: room.createdAt.toISOString(),
                        creatorSocketId: room.creatorSocketId,
                        selectedPromptId: room.selectedPromptId,
                    },
                    {
                        userId: socket.data.userId,
                        guestId: cleanGuestId,
                        username,
                    },
                ).catch((err) => console.error("failed to save participant:", err));

                if (room.selectedPromptId) {
                    const prompt =
                        CODING_PROMPTS.find(
                            (p: { id: string }) => p.id === room.selectedPromptId,
                        ) ?? null;
                    socket.emit("prompt:updated", {
                        promptId: room.selectedPromptId,
                        prompt,
                    });
                }

                socket.emit("room:joined", {
                    isCreator,
                    code: room.currentCode || "",
                    stdin: room.currentStdin || "",
                });

                if (room.status === "inactive") {
                    socket.emit("room:status-change", { status: "inactive" });
                }
            } catch (err) {
                console.error("room:join error", err);
            }
        });

        socket.on(
            "room:chat-message",
            ({ roomId, message }: ChatMessagePayload) => {
                let cleanRoomId: string;
                let cleanMessage: string;
                try {
                    cleanRoomId = validateRoomId(roomId);
                    cleanMessage = validateChatMessage(message);
                } catch (err) {
                    return emitValidationError(
                        socket,
                        "room:chat-message",
                        err
                    );
                }

                io.to(cleanRoomId).emit("room:chat-message", {
                    socketId: socket.id,
                    username: socket.data.username || "Anonymous",
                    message: cleanMessage,
                    sentAt: new Date().toISOString(),
                });
            },
        );

        socket.on("room:code-change", ({ roomId, code }: CodeChangePayload) => {
            let cleanRoomId: string;
            let cleanCode: string;
            try {
                cleanRoomId = validateRoomId(roomId);
                cleanCode = validateCode(code);
            } catch (err) {
                return emitValidationError(socket, "room:code-change", err);
            }

            Room.findOne({ roomId: cleanRoomId })
                .then((room) => {
                    if (!room || room.status === "inactive") return;

                    recordCodeChanged(cleanRoomId, cleanCode).catch((err) =>
                        console.error("failed to save history code:", err)
                    );
                    socket.to(cleanRoomId).emit("room:code-change", { code: cleanCode });
                    room.currentCode = cleanCode;
                    return room.save();
                })
                .catch((err) => console.error("failed to save code:", err));
        });

        socket.on("room:stdin-change", ({ roomId, stdin }: StdinChangePayload) => {
            let cleanRoomId: string;
            let cleanStdin: string;
            try {
                cleanRoomId = validateRoomId(roomId);
                cleanStdin = validateStdin(stdin);
            } catch (err) {
                return emitValidationError(socket, "room:stdin-change", err);
            }

            Room.findOne({ roomId: cleanRoomId })
                .then((room) => {
                    if (!room || room.status === "inactive") return;

                    socket.to(cleanRoomId).emit("room:stdin-change", { stdin: cleanStdin });
                    room.currentStdin = cleanStdin;
                    return room.save();
                })
                .catch((err) => console.error("failed to save stdin:", err));
        });

        socket.on("room:end-interview", async ({ roomId, code, stdin }: EndInterviewPayload) => {
            let cleanRoomId: string;
            let cleanCode: string;
            let cleanStdin: string;
            try {
                cleanRoomId = validateRoomId(roomId);
                if (typeof code !== "string") throw "Code must be a string";
                if (code.length > 20000) throw "Code must be at most 20000 characters long";
                cleanCode = code;
                cleanStdin = validateStdin(stdin);
            } catch (err) {
                return emitValidationError(socket, "room:end-interview", err);
            }

            try {
                const room = await Room.findOne({ roomId: cleanRoomId });
                if (!room) return;

                if (room.createdBy.toString() !== socket.data.userId) {
                    return emitValidationError(
                        socket,
                        "room:end-interview",
                        "Only the interviewer can end the interview",
                    );
                }

                room.status = "inactive";
                room.currentCode = cleanCode;
                room.currentStdin = cleanStdin;
                await room.save();

                const prompt = room.selectedPromptId
                    ? CODING_PROMPTS.find((p) => p.id === room.selectedPromptId) ?? null
                    : null;

                await recordCodeChanged(cleanRoomId, cleanCode);
                await recordPromptSelected(cleanRoomId, room.selectedPromptId, prompt);
                await recordRoomStatus(cleanRoomId, "inactive");

                io.to(cleanRoomId).emit("room:status-change", { status: "inactive" });
                io.to(cleanRoomId).emit("room:chat-message", {
                    socketId: socket.id,
                    username: "System",
                    message: "The interviewer ended this interview.",
                    sentAt: new Date().toISOString(),
                });
            } catch (err) {
                console.error("room:end-interview error", err);
            }
        });

        socket.on(
            "prompt:select",
            async ({
                roomId,
                promptId,
            }: {
                roomId: string;
                promptId: string;
            }) => {
                let cleanRoomId: string;
                let cleanPromptId: string;
                try {
                    cleanRoomId = validateRoomId(roomId);
                    cleanPromptId = validatePromptId(promptId);
                } catch (err) {
                    return emitValidationError(socket, "prompt:select", err);
                }

                try {
                    const room = await Room.findOne({ roomId: cleanRoomId });
                    if (!room) return;
                    if (room.createdBy.toString() !== socket.data.userId) return;
                    if (room.selectedPromptId) {
                        return emitValidationError(
                            socket,
                            "prompt:select",
                            "Prompt has already been assigned",
                        );
                    }

                    const prompt =
                        CODING_PROMPTS.find(
                            (p: { id: string }) => p.id === cleanPromptId
                        ) ?? null;
                    if (!prompt) return;

                    room.selectedPromptId = cleanPromptId;
                    await room.save();

                    await recordPromptSelected(cleanRoomId, cleanPromptId, prompt);
                    io.to(cleanRoomId).emit("prompt:updated", {
                        promptId: cleanPromptId,
                        prompt,
                    });
                } catch (err) {
                    console.error("prompt:select error", err);
                }
            },
        );

        socket.on("prompt:clear", async ({ roomId }: { roomId: string }) => {
            let cleanRoomId: string;
            try {
                cleanRoomId = validateRoomId(roomId);
            } catch (err) {
                return emitValidationError(socket, "prompt:clear", err);
            }

            try {
                const room = await Room.findOne({ roomId: cleanRoomId });
                if (!room) return;
                if (room.createdBy.toString() !== socket.data.userId) return;
                if (room.selectedPromptId) {
                    return emitValidationError(
                        socket,
                        "prompt:clear",
                        "Prompt has already been assigned",
                    );
                }

                room.selectedPromptId = null;
                await room.save();

                await recordPromptSelected(cleanRoomId, null, null);
                io.to(cleanRoomId).emit("prompt:updated", {
                    promptId: null,
                    prompt: null,
                });
            } catch (err) {
                console.error("prompt:clear error", err);
            }
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
