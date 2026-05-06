import { Router } from "express";
import type { Server as SocketIOServer } from "socket.io";
import type {
    ClientToServerEvents,
    ExecutionRequest,
    ExecutionResult,
    ServerToClientEvents,
} from "@codedock/shared";
import { ExecutionHistory } from "../models/ExecutionHistory.js";

type CodeDockSocketServer = SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents
>;

const RUNNER_URL = process.env.RUNNER_URL || "http://localhost:5001";

export function createRunRoutes(io: CodeDockSocketServer) {
    const router = Router();

    router.post("/python", async (req, res) => {
        const { code, roomId, username, input } = req.body as ExecutionRequest & {
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
                body: JSON.stringify({ code, input }),
            });

            const result = (await runnerResponse.json()) as ExecutionResult;
            const ranBy = username?.trim() || "Anonymous";

            if (roomId) {
                io.to(roomId).emit("room:execution-result", {
                    output: result.output,
                    error: result.error,
                    exitCode: result.exitCode,
                    timedOut: result.timedOut,
                    runtimeMs: result.runtimeMs,
                    ranBy,
                    sentAt: new Date().toISOString(),
                });

                ExecutionHistory.create({
                    roomId,
                    code,
                    language: "python",
                    output: result.output,
                    error: result.error,
                    exitCode: result.exitCode,
                    timedOut: result.timedOut,
                    runtimeMs: result.runtimeMs,
                    ranBy,
                }).catch((err) => console.error("Failed to save execution history:", err));
            }

            return res.status(runnerResponse.status).json(result);
        } catch (err) {
            console.error(err);
            return res.status(500).json({
                error: "Failed to connect to runner",
            });
        }
    });

    return router;
}
