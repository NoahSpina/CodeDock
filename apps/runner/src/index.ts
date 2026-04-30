import express from "express";
import cors from "cors";
import Docker from "dockerode";
import type { ExecutionRequest, ExecutionResult } from "@codedock/shared";

const app = express();
const docker = new Docker();

const PORT = process.env.PORT || 5000;
const EXEC_TIMEOUT_MS = Number(process.env.EXEC_TIMEOUT_MS || 5000);
const MAX_OUTPUT_BYTES = Number(process.env.MAX_OUTPUT_BYTES || 100000);
const PYTHON_IMAGE = process.env.PYTHON_IMAGE || "python:3.12-alpine";
const MAX_CODE_CHARS = 20000;

app.use(cors());
app.use(express.json({ limit: "100kb" }));

function parseDockerLogs(buffer: Buffer) {
    let stdout = "";
    let stderr = "";
    let offset = 0;

    while (offset + 8 <= buffer.length) {
        const streamType = buffer[offset];
        const payloadLength = buffer.readUInt32BE(offset + 4);

        const payloadStart = offset + 8;
        const payloadEnd = payloadStart + payloadLength;

        if (payloadEnd > buffer.length) {
            break;
        }

        const text = buffer.subarray(payloadStart, payloadEnd).toString("utf8");

        if (streamType === 1) {
            stdout += text;
        } else if (streamType === 2) {
            stderr += text;
        }

        offset = payloadEnd;
    }

    return { stdout, stderr };
}

app.post("/run/python", async (req, res) => {
    const { code, input } = req.body as Pick<ExecutionRequest, "code" | "input">;

    if (!code || typeof code !== "string") {
        return res.status(400).json({ error: "Code is required" });
    }

    if (code.length > MAX_CODE_CHARS) {
        return res.status(413).json({ error: "Code is too large" });
    }

    if (input !== undefined && typeof input !== "string") {
        return res.status(400).json({ error: "Input must be a string" });
    }

    const startTime = Date.now();
    let timedOut = false;
    let container: Docker.Container | undefined;

    try {
        container = await docker.createContainer({
            Image: PYTHON_IMAGE,
            Cmd: ["python3", "-u", "-c", code],
            AttachStdout: true,
            AttachStderr: true,
            AttachStdin: true,
            OpenStdin: true,
            StdinOnce: true,
            Tty: false,
            Env: ["PYTHONDONTWRITEBYTECODE=1"], // prevents python from writing bytecode cache files
            WorkingDir: "/tmp", // where files are stored on container
            User: "1000:1000", // regular non-root user
            NetworkDisabled: true, // interviews don't need api requests lol
            HostConfig: {
                Memory: 128 * 1024 * 1024, // 128 MB of RAM
                NanoCpus: 500_000_000,
                PidsLimit: 64, // only 64 processes can run
                ReadonlyRootfs: true, // code cant write through docker filesystem
                CapDrop: ["ALL"], // limits linux power
                SecurityOpt: ["no-new-privileges"],
                Tmpfs: {
                    "/tmp": "rw,nosuid,nodev,size=64m", // code can only write to /tmp
                },
            },
        });

        const stdinStream = await container.attach({
            stream: true,
            stdin: true,
            hijack: true, // apparently need this for std input...
            stdout: false,
            stderr: false,
        });

        await container.start();

        // write in the user input
        if (input) {
            const normalizedInput = input.endsWith("\n") ? input : input + "\n";

            stdinStream.write(normalizedInput);
        }

        stdinStream.end(); // no more input is coming

        const timeoutId = setTimeout(async () => {
            timedOut = true;
            await container?.kill().catch((e) => {console.log("Container killing failed: ", e)});
        }, EXEC_TIMEOUT_MS);

        const waitResult = await container.wait();
        clearTimeout(timeoutId);

        const logsBuffer = await container.logs({
        stdout: true,
            stderr: true,
        });

        const { stdout, stderr } = parseDockerLogs(logsBuffer);

        const runtimeMs = Date.now() - startTime;

        const result: ExecutionResult = {
            exitCode: timedOut ? null : waitResult.StatusCode,
            output: stdout.slice(0, MAX_OUTPUT_BYTES),
            error: timedOut
                ? `Execution timed out after ${EXEC_TIMEOUT_MS / 1000} seconds.`
                : stderr.slice(0, MAX_OUTPUT_BYTES),
            timedOut,
            runtimeMs,
        };

        return res.json(result);
    } catch (error) {
        return res.status(500).json({
            error: error instanceof Error ? error.message : "Docker runner failed",
        });
    } finally {
        if (container) {
            await container.remove({ force: true }).catch((e) => console.log("Container deletion failed: ", e));
        }
    }
});

app.listen(PORT, () => {
    console.log(`Runner listening on port ${PORT}`);
});