import mongoose, { type Document } from "mongoose";

interface IPrompt extends Document {
    id: string;
    title: string;
    difficulty: "Easy" | "Medium" | "Hard";
    category: string;
    description: string;
    examples: { input: string; output: string; explanation?: string }[];
    constraints: string[];
    starterCode: string;
}

const promptSchema = new mongoose.Schema<IPrompt>({
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    difficulty: {
        type: String,
        enum: ["Easy", "Medium", "Hard"],
        required: true,
    },
    category: { type: String, required: true },
    description: { type: String, required: true },
    examples: [
        {
            input: String,
            output: String,
            explanation: String,
        },
    ],
    constraints: [String],
    starterCode: { type: String, required: true },
});

export const Prompt = mongoose.model<IPrompt>("Prompt", promptSchema);
