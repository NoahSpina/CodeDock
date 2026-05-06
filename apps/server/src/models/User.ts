import mongoose, { type Document } from "mongoose";

interface IUser extends Document {
    username: string;
    email: string;
    passwordHash: string;
    roomsJoined: { roomId: string; joinedAt: Date }[];
}

const userSchema = new mongoose.Schema<IUser>(
    {
        username: { type: String, required: true, unique: true, trim: true },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        passwordHash: { type: String, required: true },
        roomsJoined: [
            {
                roomId: { type: String },
                joinedAt: { type: Date, default: Date.now },
            },
        ],
    },
    { timestamps: true }
);

export const User = mongoose.model<IUser>("User", userSchema);