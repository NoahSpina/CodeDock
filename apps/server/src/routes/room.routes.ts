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
import {
    roomCreateLimiter,
    roomJoinLimiter,
    readLimiter,
} from "../middleware/rateLimits.js";
import {
    validateGuestId,
    validateInviteCode,
    validatePromptIdOrNull,
    validateRoomId,
    validateRoomStatus,
    validateRoomTitle,
} from "../validation.js";

const router = Router();

router.post("/", requireAuth, roomCreateLimiter, async (req: AuthRequest, res) => {
    let title: string;
    let guestId: string | undefined;
    try {
        title = validateRoomTitle(req.body?.title);
        guestId = validateGuestId(req.body?.guestId);
    } catch (err) {
        return res
            .status(400)
            .json({ error: typeof err === "string" ? err : "Invalid input" });
    }

    try {
        const room = await Room.create({
            title,
            createdBy: req.user!.userId,
        });

        await User.findByIdAndUpdate(req.user!.userId, {
            $push: { roomsJoined: { roomId: room.roomId } },
        });

        await createHistorySession(
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

router.post("/join", requireAuth, roomJoinLimiter, async (req: AuthRequest, res) => {
    let inviteCode: string;
    let guestId: string | undefined;
    try {
        inviteCode = validateInviteCode(req.body?.inviteCode);
        guestId = validateGuestId(req.body?.guestId);
    } catch (err) {
        return res
            .status(400)
            .json({ error: typeof err === "string" ? err : "Invalid input" });
    }

    try {
        const room = await Room.findOne({ inviteCode });

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

        await recordParticipantJoined(
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

router.get("/:roomId", readLimiter, async (req, res) => {
    let roomId: string;
    try {
        roomId = validateRoomId(req.params.roomId);
    } catch (err) {
        return res
            .status(400)
            .json({ error: typeof err === "string" ? err : "Invalid input" });
    }

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
    let roomId: string;
    let promptId: string | null;
    try {
        roomId = validateRoomId(req.params.roomId);
        promptId = validatePromptIdOrNull(req.body?.promptId);
    } catch (err) {
        return res
            .status(400)
            .json({ error: typeof err === "string" ? err : "Invalid input" });
    }

    try {
        const room = await Room.findOne({ roomId });
        if (!room) {
            return res.status(404).json({ error: "Room not found" });
        }
        if (room.selectedPromptId) {
            return res.status(409).json({ error: "Prompt has already been assigned" });
        }

        room.selectedPromptId = promptId;
        await room.save();

        const prompt = room.selectedPromptId
            ? CODING_PROMPTS.find((p: { id: string }) => p.id === room.selectedPromptId) ?? null
            : null;
        await recordPromptSelected(roomId, room.selectedPromptId, prompt);

        return res.json({ roomId, selectedPromptId: room.selectedPromptId });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to update prompt" });
    }
});

router.patch("/:roomId/status", requireAuth, async (req: AuthRequest, res) => {
    let roomId: string;
    let status: "active" | "inactive";
    try {
        roomId = validateRoomId(req.params.roomId);
        status = validateRoomStatus(req.body?.status);
    } catch (err) {
        return res
            .status(400)
            .json({ error: typeof err === "string" ? err : "Invalid input" });
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
        await recordRoomStatus(roomId, status);

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
