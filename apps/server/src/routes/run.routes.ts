import { Router } from "express";
import type { Server as SocketIOServer } from "socket.io";
import type {
    ClientToServerEvents,
    ExecutionResult,
    ServerToClientEvents,
    TestCase
} from "@codedock/shared";
import { recordExecution } from "../data/historyStore.js";
import { CODING_PROMPTS } from "../data/prompts.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { runLimiter } from "../middleware/rateLimits.js";
import {
    validateCode,
    validateGuestId,
    validateLanguage,
    validateRoomId,
    validateStdin,
} from "../validation.js";

type CodeDockSocketServer = SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents
>;

const RUNNER_URL = process.env.RUNNER_URL || "http://localhost:5000";

export function createRunRoutes(io: CodeDockSocketServer) {
    const router = Router();

    router.post(
        "/python",
        requireAuth,
        runLimiter,
        async (req: AuthRequest, res) => {
            let code: string;
            let input: string;
            let roomId: string | undefined;
            let guestId: string | undefined;
            try {
                validateLanguage(req.body?.language ?? "python");
                code = validateCode(req.body?.code);
                input = validateStdin(req.body?.input);
                guestId = validateGuestId(req.body?.guestId);
                if (req.body?.roomId !== undefined && req.body?.roomId !== null) {
                    roomId = validateRoomId(req.body.roomId);
                }
            } catch (err) {
                return res
                    .status(400)
                    .json({ error: typeof err === "string" ? err : "Invalid input" });
            }

            const userId = req.user?.userId;
            const username = req.user?.username || "Anonymous";

            try {
                const runnerResponse = await fetch(`${RUNNER_URL}/run/python`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ code, input }),
                });

                const result = (await runnerResponse.json()) as ExecutionResult;

                if (roomId) {
                    recordExecution(
                        roomId,
                        { userId, guestId, username },
                        code,
                        input || "",
                        result,
                    );

                    io.to(roomId).emit("room:execution-result", {
                        output: result.output,
                        error: result.error,
                        exitCode: result.exitCode,
                        timedOut: result.timedOut,
                        runtimeMs: result.runtimeMs,
                        ranBy: username,
                        sentAt: new Date().toISOString(),
                    });
                }

                return res.status(runnerResponse.status).json(result);
            } catch (error) {
                return res.status(500).json({
                    error: "Failed to connect to runner",
                });
            }
        }
    );

    router.post("/tests", async (req, res) => {
        const { promptId, code } = req.body as {
            promptId?: string;
            code?: string;
        };

        if (!promptId || !code) {
            return res.status(400).json({ error: "promptId and code are required" });
        }

        const prompt = CODING_PROMPTS.find((p) => p.id === promptId);
        if (!prompt) {
            return res.status(404).json({ error: "Prompt not found" });
        }

        const visibleTestCases = prompt.testCases.filter((tc: TestCase) => !tc.hidden);
        const harness = buildHarness(code, prompt.id, visibleTestCases);

        try {
            const runnerResponse = await fetch(`${RUNNER_URL}/run/python`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: harness }),
            });

            const result = (await runnerResponse.json()) as ExecutionResult;

            if (result.timedOut) {
                return res.json({ error: "Code timed out", results: [] });
            }

            const results = parseHarnessOutput(result.output, result.error, visibleTestCases);
            return res.json({ results });
        } catch {
            return res.status(500).json({ error: "Failed to connect to runner" });
        }
    });

    return router;
}

function buildHarness(code: string, promptId: string, testCases: TestCase[]): string {
    const fnName = promptId.replace(/-/g, "_");
    const lines: string[] = [];

    lines.push(code);
    lines.push("");
    lines.push("import json, sys");
    lines.push("results = []");
    lines.push("");

    testCases.forEach((tc, i) => {
        const argsJson = JSON.stringify(JSON.stringify(tc.args));
        const expectedJson = JSON.stringify(JSON.stringify(tc.expected));
        lines.push(`try:`);
        lines.push(`    args = json.loads(${argsJson})`);
        lines.push(`    expected = json.loads(${expectedJson})`);
        lines.push(`    result = ${fnName}(*args)`);
        lines.push(`    passed = result == expected`);
        lines.push(`    results.append({"index": ${i}, "passed": passed, "result": result, "expected": expected, "error": None})`);
        lines.push(`except Exception as e:`);
        lines.push(`    results.append({"index": ${i}, "passed": False, "result": None, "expected": json.loads(${expectedJson}), "error": str(e)})`);
        lines.push("");
    });

    lines.push("print('__TEST_RESULTS__' + json.dumps(results))");

    return lines.join("\n");
}

function parseHarnessOutput(
    output: string,
    stderr: string,
    testCases: TestCase[]
): { index: number; passed: boolean; result: unknown; expected: unknown; error: string | null }[] {
    const marker = "__TEST_RESULTS__";
    const markerIndex = output.indexOf(marker);

    if (markerIndex === -1) {
        return testCases.map((tc, i) => ({
            index: i,
            passed: false,
            result: null,
            expected: tc.expected,
            error: stderr || "Code could not be executed",
        }));
    }

    try {
        return JSON.parse(output.slice(markerIndex + marker.length));
    } catch {
        return testCases.map((tc, i) => ({
            index: i,
            passed: false,
            result: null,
            expected: tc.expected,
            error: "Failed to parse test results",
        }));
    }
}
