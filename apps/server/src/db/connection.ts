import mongoose from "mongoose";
import { CODING_PROMPTS } from "../data/prompts.js";
import { Prompt } from "../models/Prompt.js";

export async function connectDB() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        throw new Error("MONGODB_URI is not set");
    }
    await mongoose.connect(uri);
    console.log("Connected to MongoDB");
    await seedPromptsIfEmpty();
}

async function seedPromptsIfEmpty() {
    const count = await Prompt.countDocuments();
    if (count === 0) {
        await Prompt.insertMany(CODING_PROMPTS);
        console.log(`Seeded ${CODING_PROMPTS.length} prompts`);
    }
}
