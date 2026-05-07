import { Router } from "express";
import { CODING_PROMPTS } from "../data/prompts.js";
import type { CodingPrompt, TestCase } from "@codedock/shared";

const router = Router();

router.get("/", (_req, res) => {
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

router.get("/:id", (req, res) => {
    const prompt = CODING_PROMPTS.find((p: CodingPrompt) => p.id === req.params.id);
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