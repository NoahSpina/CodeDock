import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";
import type {
    ClientToServerEvents,
    ServerToClientEvents,
    CodingPrompt
} from "@codedock/shared";

const SERVER_URL =
    process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000";

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
    SERVER_URL,
    {
        autoConnect: false,
    },
);


export function emitSelectPrompt(roomId: string, promptId: string) {
    socket.emit("prompt:select", { roomId, promptId });
}

export function emitClearPrompt(roomId: string) {
    socket.emit("prompt:clear", { roomId });
}

export function onPromptUpdated(
    cb: (payload: { promptId: string | null; prompt: CodingPrompt | null }) => void
) {
    socket.on("prompt:updated", cb);
}

export function offPromptUpdated(
    cb: (payload: { promptId: string | null; prompt: CodingPrompt | null }) => void
) {
    socket.off("prompt:updated", cb);
}