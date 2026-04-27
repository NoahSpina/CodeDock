import dotenv from "dotenv";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import type {
    ClientToServerEvents,
    ServerToClientEvents,
} from "@codedock/shared";
import app from "./app.js";
import { registerSocketHandlers } from "./sockets/index.js";
import { createRunRoutes } from "./routes/run.routes.js";

dotenv.config();

const PORT = process.env.PORT || 4000;

const server = http.createServer(app);

const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(
    server,
    {
        cors: {
            origin: "http://localhost:3000",
            methods: ["GET", "POST"],
        },
    },
);

app.use("/api/run", createRunRoutes(io));

registerSocketHandlers(io);

server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
