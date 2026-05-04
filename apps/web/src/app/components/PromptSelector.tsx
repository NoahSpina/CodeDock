"use client";

import { useState, useEffect } from "react";
import { emitSelectPrompt, emitClearPrompt } from "@/lib/socket";

interface PromptSummary {
    id: string;
    title: string;
    difficulty: "Easy" | "Medium" | "Hard";
    category: string;
}

interface Props {
    roomId: string;
    currentPromptId: string | null;
    onClose: () => void;
}

export default function PromptSelector({ roomId, currentPromptId, onClose }: Props) {
    const [prompts, setPrompts] = useState<PromptSummary[]>([]);
    const [selected, setSelected] = useState<string | null>(currentPromptId);

    useEffect(() => {
        fetch(`${process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:4000"}/api/prompts`)
            .then((r) => r.json())
            .then(setPrompts)
            .catch(() => { });
    }, []);

    function handleConfirm() {
        if (selected) {
            emitSelectPrompt(roomId, selected);
        } else {
            emitClearPrompt(roomId);
        }
        onClose();
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-md mx-4 flex flex-col max-h-[80vh]">
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700">
                    <h2 className="text-white font-semibold">Select a Prompt</h2>
                    <button onClick={onClose} className="text-zinc-400 hover:text-white">✕</button>
                </div>

                <div className="overflow-y-auto flex-1 p-3 space-y-2">
                    {prompts.map((p) => (
                        <button
                            key={p.id}
                            onClick={() => setSelected(selected === p.id ? null : p.id)}
                            className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${selected === p.id
                                    ? "border-blue-500 bg-blue-500/10 text-white"
                                    : "border-zinc-700 text-zinc-300 hover:border-zinc-500"
                                }`}
                        >
                            <span className="font-medium">{p.title}</span>
                            <span className="ml-2 text-xs text-zinc-500">{p.difficulty} · {p.category}</span>
                        </button>
                    ))}
                </div>

                <div className="flex gap-2 justify-end px-4 py-3 border-t border-zinc-700">
                    <button onClick={onClose} className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white">
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={selected === currentPromptId}
                        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-40"
                    >
                        {selected ? "Set Prompt" : "Clear Prompt"}
                    </button>
                </div>
            </div>
        </div>
    );
}