import { Router } from "express";
import { Prompt } from "../models/Prompt.js";

const router = Router();

router.get("/", async (_req, res) => {
    try {
        const prompts = await Prompt.find(
            {},
            { id: 1, title: 1, difficulty: 1, category: 1, _id: 0 }
        ).lean();
        res.json(prompts);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to get prompts" });
    }
});

router.get("/:id", async (req, res) => {
    try {
        const prompt = await Prompt.findOne(
            { id: req.params.id },
            { _id: 0, __v: 0 }
        ).lean();
        if (!prompt) {
            res.status(404).json({ error: "Prompt not found" });
            return;
        }
        res.json(prompt);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to get prompt" });
    }
});

export default router;
