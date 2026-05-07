"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Actor, InterviewHistorySummary } from "@codedock/shared";
import { getOrCreateActor } from "@/lib/identity";

const SERVER_URL =
    process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000";

function formatDate(value: string) {
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
}

export default function InterviewerHistoryPage() {
    const [actor, setActor] = useState<Actor | null>(null);
    const [sessions, setSessions] = useState<InterviewHistorySummary[]>([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadHistory() {
            const currentActor = getOrCreateActor();
            setActor(currentActor);

            try {
                const params = new URLSearchParams({
                    guestId: currentActor.guestId || "",
                    username: currentActor.username,
                });
                const res = await fetch(`${SERVER_URL}/api/history/interviewer?${params}`, {
                    cache: "no-store",
                });
                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || "Failed to load history");
                }

                setSessions(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Something went wrong");
            } finally {
                setLoading(false);
            }
        }

        loadHistory();
    }, []);

    return (
        <main className="min-h-screen bg-slate-950 p-6 text-white">
            <div className="mx-auto max-w-6xl">
                <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-sm uppercase tracking-wide text-slate-400">History</p>
                        <h1 className="text-3xl font-bold">Interviewer Sessions</h1>
                        <p className="mt-2 text-slate-300">Rooms created by {actor?.username || "you"}.</p>
                    </div>
                    <Link className="rounded-lg bg-white px-4 py-2 font-medium text-black hover:bg-slate-200" href="/">
                        Home
                    </Link>
                </header>

                {error ? (
                    <p className="rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-red-200">{error}</p>
                ) : null}

                {loading ? (
                    <p className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-slate-300">Loading history...</p>
                ) : null}

                {!loading && sessions.length === 0 ? (
                    <section className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-slate-300">
                        No interviewer history yet. Create a room and run an interview to see it here.
                    </section>
                ) : null}

                <section className="grid gap-4">
                    {sessions.map((session) => (
                        <Link
                            key={session.roomId}
                            href={`/history/${session.roomId}`}
                            className="rounded-xl border border-slate-800 bg-slate-900 p-5 hover:border-blue-500"
                        >
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-xl font-semibold">{session.title}</h2>
                                    <p className="mt-1 text-sm text-slate-400">
                                        Invite {session.inviteCode} - {session.status}
                                    </p>
                                    <p className="mt-3 text-slate-300">
                                        Candidates: {session.candidates.map((candidate) => candidate.username).join(", ") || "None yet"}
                                    </p>
                                    <p className="mt-1 text-slate-300">
                                        Prompt: {session.selectedPromptTitle || "No prompt selected"}
                                    </p>
                                </div>
                                <div className="text-right text-sm text-slate-400">
                                    <p>Created {formatDate(session.createdAt)}</p>
                                    <p>Updated {formatDate(session.updatedAt)}</p>
                                    <p>{session.lastExecution ? `Last run code ${session.lastExecution.exitCode}` : "No runs yet"}</p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </section>
            </div>
        </main>
    );
}

