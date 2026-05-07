import { Router } from "express";
import { CODING_PROMPTS } from "../data/prompts.js";
import type { CodingPrompt, TestCase } from "@codedock/shared";
import { readLimiter } from "../middleware/rateLimits.js";
import { validatePromptId } from "../validation.js";

const router = Router();

router.get("/", readLimiter, (_req, res) => {
    const summaries = CODING_PROMPTS.map(
        ({ id, title, difficulty, category }: CodingPrompt) => ({
            id,
            title,
            difficulty,
            category,
        })
    );
    res.json(summaries);
});

router.get("/:id", readLimiter, (req, res) => {
    let id: string;
    try {
        id = validatePromptId(req.params.id);
    } catch (err) {
        res.status(400).json({
            error: typeof err === "string" ? err : "Invalid input",
        });
        return;
    }

    const prompt = CODING_PROMPTS.find((p: CodingPrompt) => p.id === id);
    if (!prompt) {
        res.status(404).json({ error: "Prompt not found" });
        return;
    }

    const tcUnhidden = {
        ...prompt,
        testCases: prompt.testCases.filter((tc: TestCase) => !tc.hidden),
    };

    res.json(tcUnhidden);
});

export default router;
