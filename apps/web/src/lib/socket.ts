import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";
import type {
    ClientToServerEvents,
    ServerToClientEvents,
} from "@codedock/shared";

const SERVER_URL =
    process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000";

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
    SERVER_URL,
    {
    autoConnect: false,
    },
);
