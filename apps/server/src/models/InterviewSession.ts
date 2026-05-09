import mongoose, { type Document } from "mongoose";
import type {
    Actor,
    CodingPrompt,
    InterviewExecution,
    RoomStatus,
} from "@codedock/shared";

export interface IInterviewSession extends Document {
    roomId: string;
    title: string;
    inviteCode: string;
    status: RoomStatus;
    interviewer: Actor;
    candidates: Actor[];
    selectedPromptId: string | null;
    selectedPrompt: CodingPrompt | null;
    finalCode: string;
    stdin: string;
    executions: InterviewExecution[];
    createdAt: Date;
    updatedAt: Date;
    closedAt?: Date;
}

const actorSchema = new mongoose.Schema<Actor>(
    {
        userId: String,
        guestId: String,
        username: { type: String, required: true, default: "Anonymous" },
    },
    { _id: false },
);

const testResultSchema = new mongoose.Schema(
    {
        index: Number,
        passed: Boolean,
        result: mongoose.Schema.Types.Mixed,
        expected: mongoose.Schema.Types.Mixed,
        error: String,
    },
    { _id: false },
);

const executionSchema = new mongoose.Schema(
    {
        kind: {
            type: String,
            enum: ["code", "tests"],
            default: "code",
        },
        ranBy: { type: actorSchema, required: true },
        code: { type: String, required: true },
        stdin: { type: String, default: "" },
        output: { type: String, default: "" },
        error: { type: String, default: "" },
        exitCode: { type: Number, default: null },
        timedOut: Boolean,
        runtimeMs: Number,
        testResults: [testResultSchema],
        createdAt: { type: Date, required: true, default: Date.now },
    },
    { _id: false },
);

const interviewSessionSchema = new mongoose.Schema<IInterviewSession>(
    {
        roomId: { type: String, required: true, unique: true },
        title: { type: String, required: true },
        inviteCode: { type: String, required: true },
        status: {
            type: String,
            enum: ["active", "inactive"],
            required: true,
            default: "active",
        },
        interviewer: { type: actorSchema, required: true },
        candidates: { type: [actorSchema], default: [] },
        selectedPromptId: { type: String, default: null },
        selectedPrompt: { type: mongoose.Schema.Types.Mixed, default: null },
        finalCode: { type: String, default: "" },
        stdin: { type: String, default: "" },
        executions: { type: [executionSchema], default: [] },
        closedAt: Date,
    },
    { timestamps: true },
);

export const InterviewSessionModel = mongoose.model<IInterviewSession>(
    "InterviewSession",
    interviewSessionSchema,
);
