"use client";

import { useState } from "react";
import type { CodingPrompt } from "@codedock/shared";
import PromptSelector from "./PromptSelector";

interface Example {
    input: string;
    output: string;
    explanation?: string;
}

interface Props {
    roomId: string;
    prompt: CodingPrompt | null;
    isCreator: boolean;
    promptId: string | null;
}

const DIFFICULTY_STYLES: Record<string, string> = {
    Easy: "text-emerald-400 bg-emerald-500/15 border border-emerald-500/25",
    Medium: "text-yellow-400 bg-yellow-500/15 border border-yellow-500/25",
    Hard: "text-red-400 bg-red-500/15 border border-red-500/25",
};

export default function PromptPanel({ roomId, prompt, isCreator, promptId }: Props) {
    const [showSelector, setShowSelector] = useState(false);

    if (!prompt) {
        return (
            <>
                <div className="flex flex-col items-center justify-center h-full gap-4 text-white/30 select-none">
                    {isCreator ? (
                        <>
                            <p className="text-sm">No prompt selected yet.</p>
                            <button
                                onClick={() => setShowSelector(true)}
                                className="px-4 py-2 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-500 transition-all cursor-pointer"
                            >
                                Assign Prompt
                            </button>
                        </>
                    ) : (
                        <p className="text-sm">Waiting for a prompt to be assigned…</p>
                    )}
                </div>
                {showSelector && (
                    <PromptSelector
                        roomId={roomId}
                        currentPromptId={promptId}
                        onClose={() => setShowSelector(false)}
                    />
                )}
            </>
        );
    }

    return (
        <>
            <div className="h-full overflow-y-auto px-5 py-4 space-y-5 text-sm text-white/80">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h2 className="text-base font-semibold text-white leading-tight">{prompt.title}</h2>
                        <p className="text-xs text-white/35 mt-0.5">{prompt.category}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${DIFFICULTY_STYLES[prompt.difficulty]}`}>
                            {prompt.difficulty}
                        </span>
                    </div>
                </div>

                <p className="text-white/70 whitespace-pre-wrap leading-relaxed">{prompt.description}</p>

                {prompt.examples.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-white/35">Examples</h3>
                        {prompt.examples.map((ex: Example, i: number) => (
                            <div key={i} className="rounded-lg bg-white/4 border border-white/8 px-4 py-3 space-y-1.5 font-mono text-xs">
                                <div><span className="text-white/35">Input: </span>{ex.input}</div>
                                <div><span className="text-white/35">Output: </span>{ex.output}</div>
                                {ex.explanation && <div className="font-sans text-white/40 pt-1">{ex.explanation}</div>}
                            </div>
                        ))}
                    </div>
                )}

                {prompt.constraints.length > 0 && (
                    <div className="space-y-2">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-white/35">Constraints</h3>
                        <ul className="space-y-1">
                            {prompt.constraints.map((c: string, i: number) => (
                                <li key={i} className="flex items-start gap-2 text-xs text-white/55">
                                    <span className="text-white/25">•</span>
                                    <code>{c}</code>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

        </>
    );
}
