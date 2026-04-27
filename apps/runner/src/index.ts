import express from "express";
import cors from "cors";
import { spawn } from "child_process";
import type { ExecutionRequest, ExecutionResult } from "@codedock/shared";

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

app.post("/run/python", (req, res) => {
    const { code } = req.body as Pick<ExecutionRequest, "code">;

    if (!code || typeof code !== "string") {
        return res.status(400).json({
            error: "Code is required",
        });
    }

    const pythonProcess = spawn("python3", ["-c", code]);

    let output = "";
    let errorOutput = "";

    pythonProcess.stdout.on("data", (data) => {
        output += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
        errorOutput += data.toString();
    });

    pythonProcess.on("close", (exitCode) => {
        const result: ExecutionResult = {
            exitCode,
            output,
            error: errorOutput,
        };

        res.json(result);
    });
});

app.listen(PORT, () => {
    console.log(`Runner listening on port ${PORT}`);
});
