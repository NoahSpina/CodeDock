import { Router } from "express";
import {
    getHistorySession,
    listCandidateHistory,
    listInterviewerHistory,
} from "../data/historyStore.js";
import type { Actor } from "@codedock/shared";
import { readLimiter } from "../middleware/rateLimits.js";
import { validateGuestId, validateRoomId } from "../validation.js";

const router = Router();

function actorFromQuery(query: Record<string, unknown>): Partial<Actor> {
    let userId: string | undefined;
    let guestId: string | undefined;
    let username: string | undefined;

    if (typeof query.userId === "string") {
        const trimmed = query.userId.trim();
        if (trimmed.length > 0 && trimmed.length <= 64) userId = trimmed;
    }

    if (query.guestId !== undefined) {
        guestId = validateGuestId(query.guestId);
    }

    if (typeof query.username === "string") {
        const trimmed = query.username.trim();
        if (trimmed.length > 0 && trimmed.length <= 30) username = trimmed;
    }

    return { userId, guestId, username };
}

function hasIdentity(actor: Partial<Actor>) {
    return Boolean(actor.userId || actor.guestId);
}

router.get("/interviewer", readLimiter, (req, res) => {
    let actor: Partial<Actor>;
    try {
        actor = actorFromQuery(req.query as Record<string, unknown>);
    } catch (err) {
        return res
            .status(400)
            .json({ error: typeof err === "string" ? err : "Invalid input" });
    }

    if (!hasIdentity(actor)) {
        return res.status(400).json({ error: "guestId or userId is required" });
    }

    return res.json(listInterviewerHistory(actor));
});

router.get("/candidate", readLimiter, (req, res) => {
    let actor: Partial<Actor>;
    try {
        actor = actorFromQuery(req.query as Record<string, unknown>);
    } catch (err) {
        return res
            .status(400)
            .json({ error: typeof err === "string" ? err : "Invalid input" });
    }

    if (!hasIdentity(actor)) {
        return res.status(400).json({ error: "guestId or userId is required" });
    }

    return res.json(listCandidateHistory(actor));
});

router.get("/:roomId", readLimiter, (req, res) => {
    let roomId: string;
    let actor: Partial<Actor>;
    try {
        roomId = validateRoomId(req.params.roomId);
        actor = actorFromQuery(req.query as Record<string, unknown>);
    } catch (err) {
        return res
            .status(400)
            .json({ error: typeof err === "string" ? err : "Invalid input" });
    }

    if (!hasIdentity(actor)) {
        return res.status(400).json({ error: "guestId or userId is required" });
    }

    const session = getHistorySession(roomId, actor);

    if (!session) {
        return res.status(404).json({ error: "History session not found" });
    }

    return res.json(session);
});

export default router;
