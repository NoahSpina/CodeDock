"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getOrCreateActor } from "@/lib/identity";

const SERVER_URL =
    process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000";

export default function Home() {
    const router = useRouter();

    const [title, setTitle] = useState("");
    const [inviteCode, setInviteCode] = useState("");
    const [error, setError] = useState("");
    const [loadingCreate, setLoadingCreate] = useState(false);
    const [loadingJoin, setLoadingJoin] = useState(false);
    const [username, setUsername] = useState<string | null>(null);

    useEffect(() => {
        const token = localStorage.getItem("codedock_token");
        if (!token) {
            router.push("/login");
            return;
        }
        queueMicrotask(() => {
            setUsername(localStorage.getItem("codedock_username"));
        });
    }, [router]);

    function handleLogout() {
        localStorage.removeItem("codedock_token");
        localStorage.removeItem("codedock_username");
        router.push("/login");
    }

    async function handleCreateRoom() {
        setError("");
        setLoadingCreate(true);

        const token = localStorage.getItem("codedock_token") ?? "";

        try {
            const actor = getOrCreateActor();
            const res = await fetch(`${SERVER_URL}/api/rooms`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ title, ...actor }),
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

        const token = localStorage.getItem("codedock_token") ?? "";

        try {
            const actor = getOrCreateActor();
            const res = await fetch(`${SERVER_URL}/api/rooms/join`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ inviteCode, ...actor }),
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

    if (!username) {
        return null;
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
                    <div className="mt-6 flex items-center justify-between">
                        <p className="text-sm text-slate-400">
                            Signed in as{" "}
                            <span className="font-semibold text-slate-200">
                                {username}
                            </span>
                        </p>
                        <button
                            onClick={handleLogout}
                            className="text-sm text-slate-500 hover:text-slate-300 cursor-pointer"
                        >
                            Sign out
                        </button>
                    </div>
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

                        <div className="grid gap-3 border-t border-slate-800 pt-5 sm:grid-cols-2">
                            <Link
                                href="/history/interviewer"
                                className="rounded-lg border border-slate-700 px-4 py-2 text-center font-medium text-slate-100 hover:border-blue-500"
                            >
                                Interviewer History
                            </Link>
                            <Link
                                href="/history/candidate"
                                className="rounded-lg border border-slate-700 px-4 py-2 text-center font-medium text-slate-100 hover:border-blue-500"
                            >
                                Candidate History
                            </Link>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}
