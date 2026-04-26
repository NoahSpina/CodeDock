"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const SERVER_URL =
    process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000";

export default function Home() {
    const router = useRouter();

    const [title, setTitle] = useState("");
    const [inviteCode, setInviteCode] = useState("");
    const [error, setError] = useState("");
    const [loadingCreate, setLoadingCreate] = useState(false);
    const [loadingJoin, setLoadingJoin] = useState(false);

    async function handleCreateRoom() {
        setError("");
        setLoadingCreate(true);

        try {
            const res = await fetch(`${SERVER_URL}/api/rooms`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ title }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to create room");
            }

            router.push(`/room/${data.roomId}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setLoadingCreate(false);
        }
    }

    async function handleJoinRoom() {
        setError("");
        setLoadingJoin(true);

        try {
            const res = await fetch(`${SERVER_URL}/api/rooms/join`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ inviteCode }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to join room");
            }

            router.push(`/room/${data.roomId}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setLoadingJoin(false);
        }
    }

    return (
        <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
            <div className="w-full max-w-3xl grid gap-6 md:grid-cols-2">
                <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
                    <h1 className="text-3xl font-bold">CodeDock</h1>
                    <p className="mt-3 text-slate-300">
                        Real-time technical interview platform.
                    </p>
                    <p className="mt-2 text-sm text-slate-400">
                        Create a private room, collaborate live, and run Python code.
                    </p>
                </section>

                <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-semibold">Create Room</h2>
                            <input
                                className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none"
                                type="text"
                                placeholder="Room title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                            <button
                                className="mt-3 w-full rounded-lg bg-white px-4 py-2 font-medium text-black disabled:opacity-50 cursor-pointer hover:bg-gray-200"
                                onClick={handleCreateRoom}
                                disabled={loadingCreate}
                            >
                                {loadingCreate ? "Creating..." : "Create Room"}
                            </button>
                        </div>

                        <div>
                            <h2 className="text-xl font-semibold">Join Room</h2>
                            <input
                                className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 uppercase outline-none"
                                type="text"
                                placeholder="Invite code"
                                value={inviteCode}
                                onChange={(e) => setInviteCode(e.target.value)}
                            />
                            <button
                                className="mt-3 w-full rounded-lg bg-slate-700 px-4 py-2 font-medium text-white disabled:opacity-50 cursor-pointer hover:bg-slate-500"
                                onClick={handleJoinRoom}
                                disabled={loadingJoin}
                            >
                                {loadingJoin ? "Joining..." : "Join Room"}
                            </button>
                        </div>

                        {error ? (
                            <p className="rounded-lg border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-200">
                                {error}
                            </p>
                        ) : null}
                    </div>
                </section>
            </div>
        </main>
    );
}