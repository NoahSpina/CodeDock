import { Router } from "express";
import {
    createRoom,
    getRoomById,
    getRoomByInviteCode,
} from "../data/roomStore.js";

const router = Router();

router.post("/", (req, res) => {
    const { title } = req.body as { title?: string };

    if (!title || title.trim().length === 0) {
        return res.status(400).json({
            error: "Room title is required",
        });
    }

    const room = createRoom(title.trim());

    return res.status(201).json(room);
});

router.post("/join", (req, res) => {
    const { inviteCode } = req.body as { inviteCode?: string };

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

export default router;