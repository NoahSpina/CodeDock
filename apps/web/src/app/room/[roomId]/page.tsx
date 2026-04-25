"use client";

import { useEffect, useState } from "react";
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
    const [error, setError] = useState("");
    const [username, setUsername] = useState("");

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
        const finalUsername = savedUsername || `User-${Math.floor(Math.random() * 1000)}`;

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

        socket.on("room:participants", handleParticipants);

        return () => {
            socket.off("room:participants", handleParticipants);
        };
    }, [roomId]);

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
                    <p className="text-slate-300">You are: {username || "Loading..."}</p>
                </header>

                <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 min-h-[500px]">
                        <h2 className="text-xl font-semibold">Code Editor</h2>
                        <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950 p-4 text-slate-400 min-h-[400px]">
                            Editor placeholder
                        </div>
                    </div>

                    <div className="grid gap-6">
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

                        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                            <h2 className="text-xl font-semibold">Chat</h2>
                            <div className="mt-4 text-slate-400">Chat placeholder</div>
                        </div>

                        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                            <h2 className="text-xl font-semibold">Output</h2>
                            <div className="mt-4 text-slate-400">Execution output placeholder</div>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}