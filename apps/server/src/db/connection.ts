import mongoose from "mongoose";
import { CODING_PROMPTS } from "../data/prompts.js";
import { Prompt } from "../models/Prompt.js";

const CONNECT_RETRIES = 12;
const CONNECT_RETRY_DELAY_MS = 2000;

export async function connectDB() {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
        throw new Error("MONGODB_URI is not set");
    }

    let lastErr: unknown;

    for (let attempt = 1; attempt <= CONNECT_RETRIES; attempt++) {
        try {
            await mongoose.connect(uri);
            console.log("Connected to MongoDB");

            await seedPromptsIfEmpty();

            return;
        } catch (err) {
            lastErr = err;

            console.error(
                `MongoDB connect attempt ${attempt}/${CONNECT_RETRIES} failed:`,
                err instanceof Error ? err.message : err,
            );

            if (attempt < CONNECT_RETRIES) {
                await new Promise((r) =>
                    setTimeout(r, CONNECT_RETRY_DELAY_MS),
                );
            }
        }
    }

    throw lastErr;
}

async function seedPromptsIfEmpty() {
    const count = await Prompt.countDocuments();
    if (count === 0) {
        await Prompt.insertMany(CODING_PROMPTS);
        console.log(`Seeded ${CODING_PROMPTS.length} prompts`);
    }
}