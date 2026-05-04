import { Router } from "express";
import {
    getHistorySession,
    listCandidateHistory,
    listInterviewerHistory,
} from "../data/historyStore.js";
import type { Actor } from "@codedock/shared";

const router = Router();

function actorFromQuery(query: Record<string, unknown>): Partial<Actor> {
    return {
        userId: typeof query.userId === "string" ? query.userId : undefined,
        guestId: typeof query.guestId === "string" ? query.guestId : undefined,
        username: typeof query.username === "string" ? query.username : undefined,
    };
}

function hasIdentity(actor: Partial<Actor>) {
    return Boolean(actor.userId || actor.guestId);
}

router.get("/interviewer", (req, res) => {
    const actor = actorFromQuery(req.query);

    if (!hasIdentity(actor)) {
        return res.status(400).json({ error: "guestId or userId is required" });
    }

    return res.json(listInterviewerHistory(actor));
});

router.get("/candidate", (req, res) => {
    const actor = actorFromQuery(req.query);

    if (!hasIdentity(actor)) {
        return res.status(400).json({ error: "guestId or userId is required" });
    }

    return res.json(listCandidateHistory(actor));
});

router.get("/:roomId", (req, res) => {
    const actor = actorFromQuery(req.query);

    if (!hasIdentity(actor)) {
        return res.status(400).json({ error: "guestId or userId is required" });
    }

    const session = getHistorySession(req.params.roomId, actor);

    if (!session) {
        return res.status(404).json({ error: "History session not found" });
    }

    return res.json(session);
});

export default router;

