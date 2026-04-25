type RoomPageProps = {
    params: Promise<{
        roomId: string;
    }>;
};

const SERVER_URL =
    process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000";

export default async function RoomPage({ params }: RoomPageProps) {
    const { roomId } = await params;

    const res = await fetch(`${SERVER_URL}/api/rooms/${roomId}`, {
        cache: "no-store",
    });

    if (!res.ok) {
        return (
            <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
                    <h1 className="text-2xl font-bold">Room not found</h1>
                    <p className="mt-2 text-slate-400">
                        The requested room does not exist.
                    </p>
                </div>
            </main>
        );
    }

    const room = await res.json();

    return (
        <main className="min-h-screen bg-slate-950 text-white p-6">
            <div className="mx-auto max-w-7xl">
                <header className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
                    <h1 className="text-3xl font-bold">{room.title}</h1>
                    <p className="mt-2 text-slate-300">Room ID: {room.roomId}</p>
                    <p className="text-slate-300">Invite Code: {room.inviteCode}</p>
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
                            <div className="mt-4 text-slate-400">Presence placeholder</div>
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