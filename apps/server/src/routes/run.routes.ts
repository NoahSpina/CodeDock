import express from "express";
import type { ExecutionRequest, ExecutionResult } from "@codedock/shared";

const router = express.Router();

const RUNNER_URL = process.env.RUNNER_URL || "http://localhost:5001";

router.post("/python", async (req, res) => {
    const { code } = req.body as Pick<ExecutionRequest, "code">;

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

        return res.status(runnerResponse.status).json(result);
    } catch (error) {
        return res.status(500).json({
            error: "Failed to connect to runner",
        });
    }
});

export default router;
