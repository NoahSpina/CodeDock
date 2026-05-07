import type {
    Actor,
    CodingPrompt,
    ExecutionResult,
    InterviewHistorySummary,
    InterviewSession,
    Room,
    RoomStatus,
} from "@codedock/shared";

const sessions = new Map<string, InterviewSession>();

function normalizeActor(actor?: Partial<Actor>): Actor {
    return {
        userId: actor?.userId,
        guestId: actor?.guestId,
        username: actor?.username?.trim() || "Anonymous",
    };
}

function sameActor(a: Actor, b: Partial<Actor>) {
    return Boolean(
        (a.userId && b.userId && a.userId === b.userId) ||
        (a.guestId && b.guestId && a.guestId === b.guestId),
    );
}

function touch(session: InterviewSession) {
    session.updatedAt = new Date().toISOString();
}

function toSummary(session: InterviewSession): InterviewHistorySummary {
    return {
        roomId: session.roomId,
        title: session.title,
        inviteCode: session.inviteCode,
        status: session.status,
        interviewer: session.interviewer,
        candidates: session.candidates,
        selectedPromptId: session.selectedPromptId,
        selectedPromptTitle: session.selectedPrompt?.title,
        lastExecution: session.executions.at(-1),
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        closedAt: session.closedAt,
    };
}

export function createHistorySession(room: Room, interviewer?: Partial<Actor>) {
    const now = new Date().toISOString();
    const actor = normalizeActor({
        guestId: interviewer?.guestId || room.creatorGuestId,
        username: interviewer?.username || room.creatorUsername,
        userId: interviewer?.userId,
    });

    sessions.set(room.roomId, {
        roomId: room.roomId,
        title: room.title,
        inviteCode: room.inviteCode,
        status: room.status,
        interviewer: actor,
        candidates: [],
        selectedPromptId: room.selectedPromptId,
        selectedPrompt: null,
        finalCode: "",
        stdin: "",
        executions: [],
        createdAt: room.createdAt || now,
        updatedAt: now,
    });
}

export function recordParticipantJoined(room: Room, actor?: Partial<Actor>) {
    const session = sessions.get(room.roomId);
    if (!session) return;

    const participant = normalizeActor(actor);
    if (sameActor(session.interviewer, participant)) {
        return;
    }

    if (!session.candidates.some((candidate) => sameActor(candidate, participant))) {
        session.candidates.push(participant);
    }

    touch(session);
}

export function recordPromptSelected(roomId: string, promptId: string | null, prompt: CodingPrompt | null) {
    const session = sessions.get(roomId);
    if (!session) return;

    session.selectedPromptId = promptId;
    session.selectedPrompt = prompt;
    touch(session);
}

export function recordCodeChanged(roomId: string, code: string) {
    const session = sessions.get(roomId);
    if (!session) return;

    session.finalCode = code;
    touch(session);
}

export function recordExecution(
    roomId: string,
    actor: Partial<Actor>,
    code: string,
    stdin: string,
    result: ExecutionResult,
) {
    const session = sessions.get(roomId);
    if (!session) return;

    session.finalCode = code;
    session.stdin = stdin;
    session.executions.push({
        ranBy: normalizeActor(actor),
        code,
        stdin,
        output: result.output,
        error: result.error,
        exitCode: result.exitCode,
        timedOut: result.timedOut,
        runtimeMs: result.runtimeMs,
        createdAt: new Date().toISOString(),
    });
    touch(session);
}

export function recordRoomStatus(roomId: string, status: RoomStatus) {
    const session = sessions.get(roomId);
    if (!session) return;

    session.status = status;
    if (status === "inactive" && !session.closedAt) {
        session.closedAt = new Date().toISOString();
    }
    touch(session);
}

export function listInterviewerHistory(actor: Partial<Actor>) {
    return Array.from(sessions.values())
        .filter((session) => sameActor(session.interviewer, actor))
        .map(toSummary)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function listCandidateHistory(actor: Partial<Actor>) {
    return Array.from(sessions.values())
        .filter((session) => session.candidates.some((candidate) => sameActor(candidate, actor)))
        .map(toSummary)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getHistorySession(roomId: string, actor: Partial<Actor>) {
    const session = sessions.get(roomId);
    if (!session) return undefined;

    const canView =
        sameActor(session.interviewer, actor) ||
        session.candidates.some((candidate) => sameActor(candidate, actor));

    return canView ? session : undefined;
}

