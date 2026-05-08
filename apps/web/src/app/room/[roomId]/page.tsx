"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import Editor from "@monaco-editor/react";
import type {
    ChatMessage,
    CodeChangeMessage,
    Participant,
    Room,
    ExecutionResult,
    ExecutionFinishedMessage,
    CodingPrompt,
    TestResult
} from "@codedock/shared";
import { socket, onPromptUpdated, offPromptUpdated } from "@/lib/socket";
import PromptPanel from "@/app/components/PromptPanel";
import { getOrCreateActor } from "@/lib/identity";

type RoomPageProps = {
    params: Promise<{
        roomId: string;
    }>;
};

const SERVER_URL =
    process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000";

export default function RoomPage({ params }: RoomPageProps) {
    const router = useRouter();

    const [roomId, setRoomId] = useState("");
    const [room, setRoom] = useState<Room | null>(null);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState("");
    const [code, setCode] = useState("");
    const [stdin, setStdin] = useState("");
    const [error, setError] = useState("");
    const [username, setUsername] = useState("");
    const [guestId, setGuestId] = useState("");
    const [output, setOutput] = useState("");
    const [isRunning, setIsRunning] = useState(false);
    const [isCreator, setIsCreator] = useState(false);
    const [activePromptId, setActivePromptId] = useState<string | null>(null);
    const [activePrompt, setActivePrompt] = useState<CodingPrompt | null>(null);
    const [testResults, setTestResults] = useState<TestResult[] | null>(null);
    const [isTestRunning, setIsTestRunning] = useState(false);
    const [notice, setNotice] = useState("");

    const starterHandledPromptIdRef = useRef<string | null>(null);
    const declinedStarterPromptIdRef = useRef<string | null>(null);
    const activePromptRef = useRef<CodingPrompt | null>(null);
    const activePromptIdRef = useRef<string | null>(null);
    const codeRef = useRef(code);

    useLayoutEffect(() => {
        codeRef.current = code;
        activePromptRef.current = activePrompt;
        activePromptIdRef.current = activePromptId;
    }, [code, activePrompt, activePromptId]);

    useEffect(() => {
        const token = localStorage.getItem("codedock_token");
        if (!token) {
            router.push("/login");
        }
    }, [router]);

    useEffect(() => {
        async function resolveParamsAndFetchRoom() {
            try {
                const resolved = await params;
                setRoomId(resolved.roomId);

                const token = localStorage.getItem("codedock_token") ?? "";

                const res = await fetch(
                    `${SERVER_URL}/api/rooms/${resolved.roomId}`,
                    {
                        cache: "no-store",
                        headers: { Authorization: `Bearer ${token}` },
                    }
                );

                if (!res.ok) {
                    throw new Error("Room not found");
                }

                const data = await res.json();
                setRoom(data);

                if (data.selectedPromptId) {
                    setActivePromptId(data.selectedPromptId);
                    fetch(`${SERVER_URL}/api/prompts/${data.selectedPromptId}`)
                        .then((r) => r.json())
                        .then((p: CodingPrompt) => setActivePrompt(p))
                        .catch(() => { });
                }
            } catch (err) {
                setError(
                    err instanceof Error ? err.message : "Something went wrong"
                );
            }
        }

        resolveParamsAndFetchRoom();
    }, [params]);

    useEffect(() => {
        if (!roomId) return;

        if (!activePromptId || !activePrompt) {
            starterHandledPromptIdRef.current = null;
            declinedStarterPromptIdRef.current = null;
            return;
        }

        if (starterHandledPromptIdRef.current === activePromptId) {
            return;
        }

        const starter = activePrompt.starterCode;
        const trimmed = codeRef.current.trim();

        if (!trimmed) {
            queueMicrotask(() => {
                setCode(starter);
                socket.emit("room:code-change", {
                    roomId,
                    code: starter,
                    guestId,
                });
            });
            starterHandledPromptIdRef.current = activePromptId;
            declinedStarterPromptIdRef.current = null;
            return;
        }

        const replace = window.confirm(
            "Replace the current code with this prompt's starter code?"
        );
        if (replace) {
            queueMicrotask(() => {
                setCode(starter);
                socket.emit("room:code-change", {
                    roomId,
                    code: starter,
                    guestId,
                });
            });
            declinedStarterPromptIdRef.current = null;
        } else {
            declinedStarterPromptIdRef.current = activePromptId;
        }
        starterHandledPromptIdRef.current = activePromptId;
    }, [activePromptId, activePrompt, roomId, guestId]);

    useEffect(() => {
        if (!roomId) return;

        const actor = getOrCreateActor();
        const finalUsername = actor.username;

        queueMicrotask(() => {
            setUsername(finalUsername);
            setGuestId(actor.guestId || "");
        });

        if (!socket.connected) {
            socket.connect();
        }

        socket.emit("room:join", {
            roomId,
            username: finalUsername,
            guestId: actor.guestId,
        });

        function handleParticipants(updatedParticipants: Participant[]) {
            setParticipants(updatedParticipants);
        }

        function handleChatMessage(message: ChatMessage) {
            setMessages((prev) => [...prev, message]);
        }

        function handleCodeChange(payload: CodeChangeMessage) {
            const prompt = activePromptRef.current;
            const pid = activePromptIdRef.current;
            if (
                pid &&
                declinedStarterPromptIdRef.current === pid &&
                prompt &&
                payload.code === prompt.starterCode
            ) {
                return;
            }
            setCode(payload.code);
        }

        function handleStdinChange({ stdin }: { stdin: string }) {
            setStdin(stdin);
        }

        function handleExecutionResult(result: ExecutionFinishedMessage) {
            const finalOutput = [result.output, result.error]
                .filter(Boolean)
                .join("\n");

            const exitInfo = result.timedOut
                ? `Process timed out.`
                : `Process exited with code ${result.exitCode}${result.runtimeMs !== undefined ? ` in ${result.runtimeMs}ms` : ""}`;

            setOutput(
                `${result.ranBy} ran the code. Output:\n\n${finalOutput ? `${finalOutput}\n${exitInfo}` : exitInfo}`
            );
        }

        function handleRoomJoined({ isCreator, code, stdin }: { isCreator: boolean; code: string; stdin: string }) {
            setIsCreator(isCreator);
            if (code) setCode(code);
            if (stdin) setStdin(stdin);
        }

        function handlePromptUpdated({
            promptId,
            prompt,
        }: {
            promptId: string | null;
            prompt: CodingPrompt | null;
        }) {
            setActivePromptId(promptId);
            setActivePrompt(prompt);
        }

        function handleValidationError({
            event,
            message,
        }: {
            event: string;
            message: string;
        }) {
            setNotice(`${event}: ${message}`);
        }

        socket.on("room:participants", handleParticipants);
        socket.on("room:chat-message", handleChatMessage);
        socket.on("room:code-change", handleCodeChange);
        socket.on("room:stdin-change", handleStdinChange);
        socket.on("room:execution-result", handleExecutionResult);
        socket.on("room:joined", handleRoomJoined);
        socket.on("room:validation-error", handleValidationError);
        onPromptUpdated(handlePromptUpdated);

        return () => {
            socket.off("room:participants", handleParticipants);
            socket.off("room:chat-message", handleChatMessage);
            socket.off("room:code-change", handleCodeChange);
            socket.off("room:stdin-change", handleStdinChange);
            socket.off("room:execution-result", handleExecutionResult);
            socket.off("room:joined", handleRoomJoined);
            socket.off("room:validation-error", handleValidationError);
            offPromptUpdated(handlePromptUpdated);
        };
    }, [roomId]);

    async function handleRunCode() {
        if (!code.trim()) {
            setOutput("No code to run.");
            return;
        }

        setIsRunning(true);
        setOutput("Running...");

        const token = localStorage.getItem("codedock_token") ?? "";

        try {
            const res = await fetch(`${SERVER_URL}/api/run/python`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    language: "python",
                    code,
                    roomId,
                    username,
                    guestId,
                    input: stdin,
                }),
            });

            const result = (await res.json()) as ExecutionResult;

            if (!res.ok) {
                setOutput(result.error || "Something went wrong.");
                return;
            }
        } catch {
            setOutput("Failed to connect to server.");
        } finally {
            setIsRunning(false);
        }
    }

    async function handleRunTests() {
        if (!activePromptId) return;
        setIsTestRunning(true);
        setTestResults(null);

        const token = localStorage.getItem("codedock_token") ?? "";

        try {
            const res = await fetch(`${SERVER_URL}/api/run/tests`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ roomId, promptId: activePromptId, code }),
            });
            const data = await res.json();
            setTestResults(data.results ?? null);
        } catch {
            setTestResults(null);
        } finally {
            setIsTestRunning(false);
        }
    }

    function handleSendMessage(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!chatInput.trim() || !roomId) return;

        socket.emit("room:chat-message", {
            roomId,
            username,
            message: chatInput,
        });

        setChatInput("");
    }

    if (error) {
        return (
            <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
                    <h1 className="text-2xl font-bold">Room error</h1>
                    <p className="mt-2 text-slate-400">{error}</p>
                </div>
            </main>
        );
    }

    if (!room) {
        return (
            <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
                    <h1 className="text-2xl font-bold">Loading room...</h1>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-slate-950 text-white p-6">
            <div className="mx-auto max-w-7xl">
                <header className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
                    <h1 className="text-3xl font-bold">{room.title}</h1>
                    <p className="mt-2 text-slate-300">Room ID: {room.roomId}</p>
                    <p className="text-slate-300">Invite Code: {room.inviteCode}</p>
                    <p className="text-slate-300">
                        You are: {username || "Loading..."}
                    </p>
                    {notice && (
                        <p className="mt-3 text-sm text-yellow-300">{notice}</p>
                    )}
                </header>

                <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 min-h-[200px]">
                    <PromptPanel
                        roomId={roomId}
                        prompt={activePrompt}
                        isCreator={isCreator}
                        promptId={activePromptId}
                    />
                </div>

                <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 min-h-[500px]">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold">Code Editor</h2>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleRunCode}
                                    disabled={isRunning}
                                    className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                                >
                                    {isRunning ? "Running..." : "Run Python"}
                                </button>
                                {activePromptId && (
                                    <button
                                        onClick={handleRunTests}
                                        disabled={isTestRunning}
                                        className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                                    >
                                        {isTestRunning ? "Testing..." : "Run Tests"}
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="mt-4 h-[500px] w-full overflow-hidden rounded-xl border border-slate-700">
                            <Editor
                                height="100%"
                                defaultLanguage="python"
                                theme="vs-dark"
                                value={code}
                                onChange={(value) => {
                                    const updatedCode = value || "";
                                    setCode(updatedCode);

                                    socket.emit("room:code-change", {
                                        roomId,
                                        code: updatedCode,
                                        guestId,
                                    });
                                }}
                                options={{
                                    minimap: { enabled: false },
                                    fontSize: 14,
                                    padding: { top: 16 },
                                    scrollBeyondLastLine: false,
                                }}
                            />
                        </div>

                        <div className="mt-6">
                            <h3 className="text-lg font-medium text-slate-200">
                                Standard Input
                            </h3>
                            <textarea
                                value={stdin}
                                onChange={(e) => {
                                    setStdin(e.target.value);
                                    socket.emit("room:stdin-change", { roomId, stdin: e.target.value, guestId });
                                }}
                                placeholder="Enter input here (optional)..."
                                spellCheck={false}
                                className="mt-2 h-[100px] w-full resize-none rounded-xl border border-slate-700 bg-slate-950 p-3 font-mono text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div className="grid gap-6">
                        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                            <h2 className="text-xl font-semibold">Output</h2>
                            <pre className="mt-4 min-h-[120px] whitespace-pre-wrap rounded-xl border border-slate-700 bg-slate-950 p-4 font-mono text-sm text-slate-300">
                                {output || "Execution output will appear here."}
                            </pre>
                        </div>
                        {testResults && (
                            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                                <h2 className="text-xl font-semibold">Test Results</h2>
                                <div className="mt-4 space-y-2">
                                    {testResults.map((tc, i) => (
                                        <div
                                            key={i}
                                            className={`rounded-lg border px-3 py-2 text-sm ${tc.passed
                                                    ? "border-emerald-700 bg-emerald-950 text-emerald-300"
                                                    : "border-red-700 bg-red-950 text-red-300"
                                                }`}
                                        >
                                            <p className="font-medium">
                                                {tc.passed ? "✓" : "✗"} Test {i + 1}
                                            </p>
                                            {!tc.passed && (
                                                <div className="mt-1 font-mono text-xs space-y-0.5 text-slate-400">
                                                    <p>Expected: {JSON.stringify(tc.expected)}</p>
                                                    <p>Got: {JSON.stringify(tc.result)}</p>
                                                    {tc.error && <p>Error: {tc.error}</p>}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <p className="mt-3 text-xs text-slate-500">
                                    {testResults.filter((r) => r.passed).length} / {testResults.length} passed
                                </p>
                            </div>
                        )}
                        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                            <h2 className="text-xl font-semibold">Chat</h2>

                            <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950 p-3 min-h-[180px] max-h-[260px] overflow-y-auto space-y-3">
                                {messages.length === 0 ? (
                                    <p className="text-slate-400">
                                        No messages yet.
                                    </p>
                                ) : (
                                    messages.map((message, index) => (
                                        <div
                                            key={`${message.socketId}-${message.sentAt}-${index}`}
                                            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2"
                                        >
                                            <p className="text-sm font-semibold text-slate-200">
                                                {message.username}
                                            </p>
                                            <p className="mt-1 text-slate-300">
                                                {message.message}
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>

                            <form
                                onSubmit={handleSendMessage}
                                className="mt-4 flex gap-2"
                            >
                                <input
                                    value={chatInput}
                                    onChange={(event) =>
                                        setChatInput(event.target.value)
                                    }
                                    placeholder="Type a message..."
                                    className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 placeholder:text-slate-500 outline-none focus:border-blue-500"
                                />

                                <button
                                    type="submit"
                                    className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-500 cursor-pointer"
                                >
                                    Send
                                </button>
                            </form>
                        </div>

                        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                            <h2 className="text-xl font-semibold">
                                Participants
                            </h2>
                            <div className="mt-4 space-y-2">
                                {participants.length === 0 ? (
                                    <p className="text-slate-400">
                                        No participants yet.
                                    </p>
                                ) : (
                                    participants.map((participant) => (
                                        <div
                                            key={participant.socketId}
                                            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200"
                                        >
                                            {participant.username}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}
