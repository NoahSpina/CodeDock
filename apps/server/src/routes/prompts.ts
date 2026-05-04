import { Router } from "express";
import { CODING_PROMPTS } from "../data/prompts.js";
import type { CodingPrompt } from "@codedock/shared";

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
    res.json(prompt);
});

export default router;