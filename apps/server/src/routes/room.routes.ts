import { Router } from "express";
import {
    createRoom,
    getRoomById,
    getRoomByInviteCode,
    setRoomPrompt,
    setRoomStatus
} from "../data/roomStore.js";
import {
    createHistorySession,
    recordParticipantJoined,
    recordPromptSelected,
    recordRoomStatus,
} from "../data/historyStore.js";

import { CODING_PROMPTS } from "../data/prompts.js";
import type { Actor, RoomStatus } from "@codedock/shared";

const router = Router();

router.post("/", (req, res) => {
    const { title, guestId, username, userId } = req.body as { title?: string } & Partial<Actor>;

    if (!title || title.trim().length === 0) {
        return res.status(400).json({
            error: "Room title is required",
        });
    }

    const actor = { guestId, username, userId };
    const room = createRoom(title.trim(), "", actor);
    createHistorySession(room, actor);

    return res.status(201).json(room);
});

router.post("/join", (req, res) => {
    const { inviteCode, guestId, username, userId } = req.body as { inviteCode?: string } & Partial<Actor>;

    if (!inviteCode || inviteCode.trim().length === 0) {
        return res.status(400).json({
            error: "Invite code is required",
        });
    }

    const room = getRoomByInviteCode(inviteCode.trim());

    if (!room) {
        return res.status(404).json({
            error: "Room not found",
        });
    }

    if (room.status === "inactive") {
        return res.status(403).json({
            error: "This room is inactive",
        });
    }

    recordParticipantJoined(room, { guestId, username, userId });

    return res.json(room);
});

router.get("/:roomId", (req, res) => {
    const { roomId } = req.params;

    const room = getRoomById(roomId);

    if (!room) {
        return res.status(404).json({
            error: "Room not found",
        });
    }

    return res.json(room);
});

router.patch("/:roomId/prompt", (req, res) => {
    const { roomId } = req.params;
    const { promptId } = req.body as { promptId?: string | null };

    const room = getRoomById(roomId);
    if (!room) {
        return res.status(404).json({ error: "Room not found" });
    }

    if (promptId !== null && promptId !== undefined) {
        const exists = CODING_PROMPTS.some((p: { id: string }) => p.id === promptId);
        if (!exists) {
            return res.status(400).json({ error: "Unknown promptId" });
        }
    }

    const nextPromptId = promptId ?? null;
    const prompt = nextPromptId
        ? CODING_PROMPTS.find((p: { id: string }) => p.id === nextPromptId) ?? null
        : null;
    const updated = setRoomPrompt(roomId, nextPromptId);
    recordPromptSelected(roomId, nextPromptId, prompt);
    return res.json({ roomId, selectedPromptId: updated?.selectedPromptId ?? null });
});

router.patch("/:roomId/status", (req, res) => {
    const { roomId } = req.params;
    const { status } = req.body as { status?: RoomStatus };

    if (status !== "active" && status !== "inactive") {
        return res.status(400).json({ error: "Status must be active or inactive" });
    }

    const room = getRoomById(roomId);
    if (!room) {
        return res.status(404).json({ error: "Room not found" });
    }

    const updated = setRoomStatus(roomId, status);
    recordRoomStatus(roomId, status);

    return res.json(updated);
});

export default router;
