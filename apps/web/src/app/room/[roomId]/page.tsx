"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { socket } from "@/lib/socket";

type Participant = {
    socketId: string;
    username: string;
};

type Room = {
    roomId: string;
    title: string;
    inviteCode: string;
    createdAt: string;
};

type ChatMessage = {
    socketId: string;
    username: string;
    message: string;
    sentAt: string;
};

type RoomPageProps = {
    params: Promise<{
        roomId: string;
    }>;
};

const SERVER_URL =
    process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000";

export default function RoomPage({ params }: RoomPageProps) {
    const [roomId, setRoomId] = useState("");
    const [room, setRoom] = useState<Room | null>(null);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState("");
    const [code, setCode] = useState("");
    const [error, setError] = useState("");
    const [username, setUsername] = useState("");
    const [output, setOutput] = useState("");
    const [isRunning, setIsRunning] = useState(false);

    useEffect(() => {
        async function resolveParamsAndFetchRoom() {
            try {
                const resolved = await params;
                setRoomId(resolved.roomId);

                const res = await fetch(`${SERVER_URL}/api/rooms/${resolved.roomId}`, {
                    cache: "no-store",
                });

                if (!res.ok) {
                    throw new Error("Room not found");
                }

                const data = await res.json();
                setRoom(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Something went wrong");
            }
        }

        resolveParamsAndFetchRoom();
    }, [params]);

    useEffect(() => {
        if (!roomId) return;

        const savedUsername = window.localStorage.getItem("codedock_username");
        const finalUsername =
            savedUsername || `User-${Math.floor(Math.random() * 1000)}`;

        setUsername(finalUsername);
        window.localStorage.setItem("codedock_username", finalUsername);

        if (!socket.connected) {
            socket.connect();
        }

        socket.emit("room:join", {
            roomId,
            username: finalUsername,
        });

        function handleParticipants(updatedParticipants: Participant[]) {
            setParticipants(updatedParticipants);
        }

        function handleChatMessage(message: ChatMessage) {
            setMessages((currentMessages) => [...currentMessages, message]);
        }

        function handleCodeChange(payload: { code: string }) {
            setCode(payload.code);
        }

        socket.on("room:participants", handleParticipants);
        socket.on("room:chat-message", handleChatMessage);
        socket.on("room:code-change", handleCodeChange);

        return () => {
            socket.off("room:participants", handleParticipants);
            socket.off("room:chat-message", handleChatMessage);
            socket.off("room:code-change", handleCodeChange);
        };
    }, [roomId]);

    async function handleRunCode() {
        if (!code.trim()) {
            setOutput("No code to run.");
            return;
        }

        setIsRunning(true);
        setOutput("Running...");

        try {
            const res = await fetch(`${SERVER_URL}/api/run/python`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ code }),
            });

            const result = await res.json();

            if (!res.ok) {
                setOutput(result.error || "Something went wrong.");
                return;
            }

            const finalOutput = [result.output, result.error]
                .filter(Boolean)
                .join("\n");

            setOutput(finalOutput || `Process exited with code ${result.exitCode}`);
        } catch {
            setOutput("Failed to connect to server.");
        } finally {
            setIsRunning(false);
        }
    }

    function handleSendMessage(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!chatInput.trim() || !roomId) {
            return;
        }

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
                </header>

                <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 min-h-[500px]">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold">Code Editor</h2>

                            <button
                                onClick={handleRunCode}
                                disabled={isRunning}
                                className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                            >
                                {isRunning ? "Running..." : "Run Python"}
                            </button>
                        </div>
                        <textarea
                            value={code}
                            onChange={(event) => {
                                const updatedCode = event.target.value;
                                setCode(updatedCode);

                                socket.emit("room:code-change", {
                                    roomId,
                                    code: updatedCode,
                                });
                            }}
                            placeholder="Start coding here..."
                            spellCheck={false}
                            className="mt-4 min-h-[400px] w-full resize-none rounded-xl border border-slate-700 bg-slate-950 p-4 font-mono text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-blue-500"
                        />
                    </div>

                    <div className="grid gap-6">
                        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                            <h2 className="text-xl font-semibold">Output</h2>
                            <pre className="mt-4 min-h-[120px] whitespace-pre-wrap rounded-xl border border-slate-700 bg-slate-950 p-4 font-mono text-sm text-slate-300">
                                {output || "Execution output will appear here."}
                            </pre>
                        </div>

                        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                            <h2 className="text-xl font-semibold">Chat</h2>

                            <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950 p-3 min-h-[180px] max-h-[260px] overflow-y-auto space-y-3">
                                {messages.length === 0 ? (
                                    <p className="text-slate-400">No messages yet.</p>
                                ) : (
                                    messages.map((message, index) => (
                                        <div
                                            key={`${message.socketId}-${message.sentAt}-${index}`}
                                            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2"
                                        >
                                            <p className="text-sm font-semibold text-slate-200">
                                                {message.username}
                                            </p>
                                            <p className="mt-1 text-slate-300">{message.message}</p>
                                        </div>
                                    ))
                                )}
                            </div>

                            <form onSubmit={handleSendMessage} className="mt-4 flex gap-2">
                                <input
                                    value={chatInput}
                                    onChange={(event) => setChatInput(event.target.value)}
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
                            <h2 className="text-xl font-semibold">Participants</h2>
                            <div className="mt-4 space-y-2">
                                {participants.length === 0 ? (
                                    <p className="text-slate-400">No participants yet.</p>
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