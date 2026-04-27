import express from "express";
import cors from "cors";
import { spawn } from "child_process";

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

app.post("/run/python", (req, res) => {
    const { code } = req.body;

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
        res.json({
            exitCode,
            output,
            error: errorOutput,
        });
    });
});

app.listen(PORT, () => {
    console.log(`Runner listening on port ${PORT}`);
});