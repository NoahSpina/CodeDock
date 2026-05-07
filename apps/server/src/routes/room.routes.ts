import { Router } from "express";
import {
    createHistorySession,
    recordParticipantJoined,
    recordPromptSelected,
    recordRoomStatus,
} from "../data/historyStore.js";
import { Room } from "../models/Room.js";
import { User } from "../models/User.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { CODING_PROMPTS } from "../data/prompts.js";
import type { Actor, RoomStatus } from "@codedock/shared";

const router = Router();

router.post("/", requireAuth, async (req: AuthRequest, res) => {
    const { title, guestId } = req.body as { title?: string } & Partial<Actor>;

    if (!title || title.trim().length === 0) {
        return res.status(400).json({ error: "Room title is required" });
    }

    try {
        const room = await Room.create({
            title: title.trim(),
            createdBy: req.user!.userId,
        });

        await User.findByIdAndUpdate(req.user!.userId, {
            $push: { roomsJoined: { roomId: room.roomId } },
        });

        createHistorySession(
            {
                roomId: room.roomId,
                title: room.title,
                inviteCode: room.inviteCode,
                status: room.status,
                createdAt: room.createdAt.toISOString(),
                creatorSocketId: room.creatorSocketId,
                selectedPromptId: room.selectedPromptId,
            },
            {
                userId: req.user!.userId,
                guestId,
                username: req.user!.username,
            },
        );

        return res.status(201).json({
            roomId: room.roomId,
            title: room.title,
            inviteCode: room.inviteCode,
            status: room.status,
            createdAt: room.createdAt.toISOString(),
            creatorSocketId: room.creatorSocketId,
            selectedPromptId: room.selectedPromptId,
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to create room" });
    }
});

router.post("/join", requireAuth, async (req: AuthRequest, res) => {
    const { inviteCode, guestId } = req.body as { inviteCode?: string } & Partial<Actor>;

    if (!inviteCode || inviteCode.trim().length === 0) {
        return res.status(400).json({ error: "Invite code is required" });
    }

    try {
        const room = await Room.findOne({
            inviteCode: inviteCode.trim().toUpperCase(),
        });

        if (!room) {
            return res.status(404).json({ error: "Room not found" });
        }

        if (room.status === "inactive") {
            return res
                .status(403)
                .json({ error: "This room is no longer active" });
        }

        await User.findByIdAndUpdate(req.user!.userId, {
            $addToSet: { roomsJoined: { roomId: room.roomId } },
        });

        recordParticipantJoined(
            {
                roomId: room.roomId,
                title: room.title,
                inviteCode: room.inviteCode,
                status: room.status,
                createdAt: room.createdAt.toISOString(),
                creatorSocketId: room.creatorSocketId,
                selectedPromptId: room.selectedPromptId,
            },
            {
                userId: req.user!.userId,
                guestId,
                username: req.user!.username,
            },
        );

        return res.json({
            roomId: room.roomId,
            title: room.title,
            inviteCode: room.inviteCode,
            status: room.status,
            createdAt: room.createdAt.toISOString(),
            creatorSocketId: room.creatorSocketId,
            selectedPromptId: room.selectedPromptId,
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to join room" });
    }
});

router.get("/:roomId", async (req, res) => {
    const { roomId } = req.params;

    try {
        const room = await Room.findOne({ roomId });

        if (!room) {
            return res.status(404).json({ error: "Room not found" });
        }

        return res.json({
            roomId: room.roomId,
            title: room.title,
            inviteCode: room.inviteCode,
            status: room.status,
            createdAt: room.createdAt.toISOString(),
            creatorSocketId: room.creatorSocketId,
            selectedPromptId: room.selectedPromptId,
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to get room" });
    }
});

router.patch("/:roomId/prompt", requireAuth, async (req: AuthRequest, res) => {
    const roomId = req.params.roomId as string;
    const { promptId } = req.body as { promptId?: string | null };

    try {
        const room = await Room.findOne({ roomId });
        if (!room) {
            return res.status(404).json({ error: "Room not found" });
        }

        if (promptId !== null && promptId !== undefined) {
            const exists = CODING_PROMPTS.some(
                (p: { id: string }) => p.id === promptId
            );
            if (!exists) {
                return res.status(400).json({ error: "Unknown promptId" });
            }
        }

        room.selectedPromptId = promptId ?? null;
        await room.save();

        const prompt = room.selectedPromptId
            ? CODING_PROMPTS.find((p: { id: string }) => p.id === room.selectedPromptId) ?? null
            : null;
        recordPromptSelected(roomId, room.selectedPromptId, prompt);

        return res.json({ roomId, selectedPromptId: room.selectedPromptId });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to update prompt" });
    }
});

router.patch("/:roomId/status", requireAuth, async (req: AuthRequest, res) => {
    const roomId = req.params.roomId as string;
    const { status } = req.body as { status?: RoomStatus };

    if (status !== "active" && status !== "inactive") {
        return res.status(400).json({ error: "Status must be active or inactive" });
    }

    try {
        const room = await Room.findOne({ roomId });
        if (!room) {
            return res.status(404).json({ error: "Room not found" });
        }

        if (room.createdBy.toString() !== req.user!.userId) {
            return res.status(403).json({ error: "Only the room creator can update status" });
        }

        room.status = status;
        await room.save();
        recordRoomStatus(roomId, status);

        return res.json({
            roomId: room.roomId,
            title: room.title,
            inviteCode: room.inviteCode,
            status: room.status,
            createdAt: room.createdAt.toISOString(),
            creatorSocketId: room.creatorSocketId,
            selectedPromptId: room.selectedPromptId,
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to update room status" });
    }
});

export default router;
