import dotenv from "dotenv";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import app from "./app.js";
import { registerSocketHandlers } from "./sockets/index.js";

dotenv.config();

const PORT = process.env.PORT || 4000;

const server = http.createServer(app);

const io = new SocketIOServer(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
    },
});

registerSocketHandlers(io);

server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});