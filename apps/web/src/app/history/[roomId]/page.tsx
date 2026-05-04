"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { InterviewSession } from "@codedock/shared";
import { getOrCreateActor } from "@/lib/identity";

type HistoryDetailPageProps = {
    params: Promise<{
        roomId: string;
    }>;
};

const SERVER_URL =
    process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000";

function formatDate(value: string) {
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
}

export default function HistoryDetailPage({ params }: HistoryDetailPageProps) {
    const [session, setSession] = useState<InterviewSession | null>(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadSession() {
            try {
                const resolved = await params;
                const actor = getOrCreateActor();
                const query = new URLSearchParams({
                    guestId: actor.guestId || "",
                    username: actor.username,
                });
                const res = await fetch(`${SERVER_URL}/api/history/${resolved.roomId}?${query}`, {
                    cache: "no-store",
                });
                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || "Failed to load session");
                }

                setSession(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Something went wrong");
            } finally {
                setLoading(false);
            }
        }

        loadSession();
    }, [params]);

    return (
        <main className="min-h-screen bg-slate-950 p-6 text-white">
            <div className="mx-auto max-w-7xl">
                <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-sm uppercase tracking-wide text-slate-400">History</p>
                        <h1 className="text-3xl font-bold">{session?.title || "Session Detail"}</h1>
                        {session ? (
                            <p className="mt-2 text-slate-300">
                                Room {session.roomId} · Invite {session.inviteCode} · {session.status}
                            </p>
                        ) : null}
                    </div>
                    <div className="flex gap-2">
                        <Link className="rounded-lg bg-slate-800 px-4 py-2 font-medium text-white hover:bg-slate-700" href="/">
                            Home
                        </Link>
                        <Link className="rounded-lg bg-slate-800 px-4 py-2 font-medium text-white hover:bg-slate-700" href="/history/interviewer">
                            Interviewer
                        </Link>
                        <Link className="rounded-lg bg-white px-4 py-2 font-medium text-black hover:bg-slate-200" href="/history/candidate">
                            Candidate
                        </Link>
                    </div>
                </header>

                {loading ? (
                    <p className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-slate-300">Loading session...</p>
                ) : null}

                {error ? (
                    <p className="rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-red-200">{error}</p>
                ) : null}

                {session ? (
                    <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
                        <section className="grid gap-6">
                            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                                <h2 className="text-xl font-semibold">Room Metadata</h2>
                                <div className="mt-4 grid gap-2 text-sm text-slate-300">
                                    <p>Created {formatDate(session.createdAt)}</p>
                                    <p>Updated {formatDate(session.updatedAt)}</p>
                                    {session.closedAt ? <p>Closed {formatDate(session.closedAt)}</p> : null}
                                    <p>Interviewer: {session.interviewer.username}</p>
                                    <p>
                                        Candidates: {session.candidates.map((candidate) => candidate.username).join(", ") || "None"}
                                    </p>
                                </div>
                            </div>

                            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                                <h2 className="text-xl font-semibold">Selected Prompt</h2>
                                {session.selectedPrompt ? (
                                    <div className="mt-4 text-slate-300">
                                        <p className="font-medium text-white">{session.selectedPrompt.title}</p>
                                        <p className="mt-1 text-sm text-slate-400">
                                            {session.selectedPrompt.difficulty} · {session.selectedPrompt.category}
                                        </p>
                                        <p className="mt-3 whitespace-pre-wrap">{session.selectedPrompt.description}</p>
                                    </div>
                                ) : (
                                    <p className="mt-4 text-slate-400">No prompt selected.</p>
                                )}
                            </div>

                            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                                <h2 className="text-xl font-semibold">Standard Input</h2>
                                <pre className="mt-4 min-h-[100px] whitespace-pre-wrap rounded-lg border border-slate-700 bg-slate-950 p-4 font-mono text-sm text-slate-300">
                                    {session.stdin || "No stdin captured."}
                                </pre>
                            </div>
                        </section>

                        <section className="grid gap-6">
                            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                                <h2 className="text-xl font-semibold">Final Code</h2>
                                <pre className="mt-4 max-h-[420px] overflow-auto whitespace-pre-wrap rounded-lg border border-slate-700 bg-slate-950 p-4 font-mono text-sm text-slate-300">
                                    {session.finalCode || "No code captured."}
                                </pre>
                            </div>

                            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                                <h2 className="text-xl font-semibold">Execution Results</h2>
                                <div className="mt-4 grid gap-4">
                                    {session.executions.length === 0 ? (
                                        <p className="text-slate-400">No executions captured.</p>
                                    ) : (
                                        session.executions.map((execution, index) => (
                                            <article
                                                key={`${execution.createdAt}-${index}`}
                                                className="rounded-lg border border-slate-700 bg-slate-950 p-4"
                                            >
                                                <div className="flex flex-wrap justify-between gap-2 text-sm text-slate-400">
                                                    <p>{execution.ranBy.username} ran code</p>
                                                    <p>{formatDate(execution.createdAt)}</p>
                                                </div>
                                                <p className="mt-2 text-sm text-slate-300">
                                                    Exit code {execution.exitCode}
                                                    {execution.runtimeMs !== undefined ? ` in ${execution.runtimeMs}ms` : ""}
                                                    {execution.timedOut ? " · timed out" : ""}
                                                </p>
                                                <pre className="mt-3 whitespace-pre-wrap rounded border border-slate-800 bg-slate-900 p-3 font-mono text-sm text-slate-300">
                                                    {[execution.output, execution.error].filter(Boolean).join("\n") || "No output."}
                                                </pre>
                                            </article>
                                        ))
                                    )}
                                </div>
                            </div>
                        </section>
                    </div>
                ) : null}
            </div>
        </main>
    );
}
