import mongoose, { type Document } from "mongoose";
import {
    asMongooseValidator,
    validateInviteCode,
    validatePromptIdOrNull,
    validateRoomId,
    validateRoomTitle,
} from "../validation.js";

export interface IRoom extends Document {
    roomId: string;
    title: string;
    inviteCode: string;
    status: "active" | "inactive";
    createdBy: mongoose.Types.ObjectId;
    creatorSocketId: string;
    selectedPromptId: string | null;
    createdAt: Date;
    updatedAt: Date;
}

const roomSchema = new mongoose.Schema<IRoom>(
    {
        roomId: {
            type: String,
            required: true,
            unique: true,
            default: () => Math.random().toString(36).slice(2, 10),
            validate: asMongooseValidator(validateRoomId),
        },
        title: {
            type: String,
            required: true,
            trim: true,
            validate: asMongooseValidator(validateRoomTitle),
        },
        inviteCode: {
            type: String,
            required: true,
            unique: true,
            default: () => Math.random().toString(36).slice(2, 8).toUpperCase(),
            validate: asMongooseValidator(validateInviteCode),
        },
        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active",
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        creatorSocketId: { type: String, default: "" },
        selectedPromptId: {
            type: String,
            default: null,
            validate: asMongooseValidator(validatePromptIdOrNull),
        },
    },
    { timestamps: true }
);

export const Room = mongoose.model<IRoom>("Room", roomSchema);
