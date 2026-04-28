import express from "express";
import cors from "cors";
import { spawn } from "child_process";
import type { ExecutionRequest, ExecutionResult } from "@codedock/shared";

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

app.post("/run/python", (req, res) => {
    const { code, input } = req.body as Pick<ExecutionRequest, "code" | "input">;

    if (!code || typeof code !== "string") {
        return res.status(400).json({
            error: "Code is required",
        });
    }

    const startTime = Date.now();
    const pythonProcess = spawn("python3", ["-c", code]);

    if (input && typeof input === "string") {
        pythonProcess.stdin.write(input);
        pythonProcess.stdin.end();
    }

    let output = "";
    let errorOutput = "";
    let isTimedOut = false;

    const timeoutId = setTimeout(() => {
        isTimedOut = true;
        pythonProcess.kill("SIGKILL");
    }, 5000);

    pythonProcess.stdout.on("data", (data) => {
        output += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
        errorOutput += data.toString();
    });

    pythonProcess.on("close", (exitCode) => {
        clearTimeout(timeoutId);
        const runtimeMs = Date.now() - startTime;

        const result: ExecutionResult = {
            exitCode: isTimedOut ? null : exitCode,
            output,
            error: isTimedOut ? "Execution timed out after 5 seconds." : errorOutput,
            timedOut: isTimedOut,
            runtimeMs,
        };

        res.json(result);
    });
});

app.listen(PORT, () => {
    console.log(`Runner listening on port ${PORT}`);
});
