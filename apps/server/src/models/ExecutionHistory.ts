import mongoose, { type Document } from "mongoose";

interface IExecutionHistory extends Document {
    roomId: string;
    code: string;
    language: string;
    output?: string;
    error?: string;
    exitCode?: number;
    timedOut?: boolean;
    runtimeMs?: number;
    ranBy?: string;
    createdAt: Date;
    updatedAt: Date;
}

const executionHistorySchema = new mongoose.Schema<IExecutionHistory>(
    {
        roomId: { type: String, required: true },
        code: { type: String, required: true },
        language: { type: String, default: "python" },
        output: String,
        error: String,
        exitCode: Number,
        timedOut: Boolean,
        runtimeMs: Number,
        ranBy: String,
    },
    { timestamps: true }
);

export const ExecutionHistory = mongoose.model<IExecutionHistory>(
    "ExecutionHistory",
    executionHistorySchema
);
