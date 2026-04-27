import { Router } from "express";
import type { Server as SocketIOServer } from "socket.io";
import type {
    ClientToServerEvents,
    ExecutionRequest,
    ExecutionResult,
    ServerToClientEvents,
} from "@codedock/shared";

type CodeDockSocketServer = SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents
>;

const RUNNER_URL = process.env.RUNNER_URL || "http://localhost:5001";

export function createRunRoutes(io: CodeDockSocketServer) {
    const router = Router();

    router.post("/python", async (req, res) => {
        const { code, roomId, username } = req.body as ExecutionRequest & {
            username?: string;
        };

        if (!code || typeof code !== "string") {
            return res.status(400).json({
                error: "Code is required",
            });
        }

        try {
            const runnerResponse = await fetch(`${RUNNER_URL}/run/python`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ code }),
            });

            const result = (await runnerResponse.json()) as ExecutionResult;

            if (roomId) {
                io.to(roomId).emit("room:execution-result", {
                    output: result.output,
                    error: result.error,
                    exitCode: result.exitCode,
                    ranBy: username?.trim() || "Anonymous",
                    sentAt: new Date().toISOString(),
                });
            }

            return res.status(runnerResponse.status).json(result);
        } catch (error) {
            return res.status(500).json({
                error: "Failed to connect to runner",
            });
        }
    });

    return router;
}