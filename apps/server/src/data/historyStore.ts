import type {
    Actor,
    CodingPrompt,
    ExecutionResult,
    InterviewExecution,
    InterviewHistorySummary,
    InterviewSession,
    Room,
    RoomStatus,
    TestResult,
} from "@codedock/shared";
import { InterviewSessionModel } from "../models/InterviewSession.js";

function normalizeActor(actor?: Partial<Actor>): Actor {
    return {
        userId: actor?.userId,
        guestId: actor?.guestId,
        username: actor?.username?.trim() || "Anonymous",
    };
}

function sameActorQuery(actor: Partial<Actor>) {
    const clauses = [];
    if (actor.userId) clauses.push({ "userId": actor.userId });
    if (actor.guestId) clauses.push({ "guestId": actor.guestId });
    return clauses;
}

function sessionCanView(session: InterviewSession, actor: Partial<Actor>) {
    return Boolean(
        (actor.userId && session.interviewer.userId === actor.userId) ||
        (actor.guestId && session.interviewer.guestId === actor.guestId) ||
        session.candidates.some(
            (candidate) =>
                (actor.userId && candidate.userId === actor.userId) ||
                (actor.guestId && candidate.guestId === actor.guestId),
        ),
    );
}

function iso(value?: Date | string) {
    return value ? new Date(value).toISOString() : undefined;
}

function toExecution(execution: InterviewExecution): InterviewExecution {
    return {
        kind: execution.kind || "code",
        ranBy: execution.ranBy,
        code: execution.code,
        stdin: execution.stdin,
        output: execution.output,
        error: execution.error,
        exitCode: execution.exitCode,
        timedOut: execution.timedOut,
        runtimeMs: execution.runtimeMs,
        testResults: execution.testResults,
        createdAt: iso(execution.createdAt) || new Date().toISOString(),
    };
}

function toSession(doc: unknown): InterviewSession {
    const raw = JSON.parse(JSON.stringify(doc)) as Omit<InterviewSession, "createdAt" | "updatedAt" | "closedAt"> & {
        createdAt: string | Date;
        updatedAt: string | Date;
        closedAt?: string | Date;
    };

    return {
        roomId: raw.roomId,
        title: raw.title,
        inviteCode: raw.inviteCode,
        status: raw.status,
        interviewer: raw.interviewer,
        candidates: raw.candidates || [],
        selectedPromptId: raw.selectedPromptId,
        selectedPrompt: raw.selectedPrompt,
        finalCode: raw.finalCode || "",
        stdin: raw.stdin || "",
        executions: (raw.executions || []).map(toExecution),
        createdAt: iso(raw.createdAt) || new Date().toISOString(),
        updatedAt: iso(raw.updatedAt) || new Date().toISOString(),
        closedAt: iso(raw.closedAt),
    };
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

export async function createHistorySession(room: Room, interviewer?: Partial<Actor>) {
    const actor = normalizeActor({
        guestId: interviewer?.guestId || room.creatorGuestId,
        username: interviewer?.username || room.creatorUsername,
        userId: interviewer?.userId,
    });

    await InterviewSessionModel.findOneAndUpdate(
        { roomId: room.roomId },
        {
            $setOnInsert: {
                roomId: room.roomId,
                title: room.title,
                inviteCode: room.inviteCode,
                interviewer: actor,
                candidates: [],
                executions: [],
                createdAt: room.createdAt || new Date().toISOString(),
            },
            $set: {
                status: room.status,
                selectedPromptId: room.selectedPromptId,
            },
        },
        { upsert: true },
    );
}

export async function recordParticipantJoined(room: Room, actor?: Partial<Actor>) {
    const participant = normalizeActor(actor);
    const session = await InterviewSessionModel.findOne({ roomId: room.roomId });
    if (!session) return;

    const isInterviewer =
        (participant.userId && session.interviewer.userId === participant.userId) ||
        (participant.guestId && session.interviewer.guestId === participant.guestId);

    if (isInterviewer) return;

    const exists = session.candidates.some(
        (candidate) =>
            (participant.userId && candidate.userId === participant.userId) ||
            (participant.guestId && candidate.guestId === participant.guestId),
    );

    if (!exists) {
        session.candidates.push(participant);
        await session.save();
    }
}

export async function recordPromptSelected(
    roomId: string,
    promptId: string | null,
    prompt: CodingPrompt | null,
) {
    await InterviewSessionModel.findOneAndUpdate(
        { roomId },
        {
            selectedPromptId: promptId,
            selectedPrompt: prompt,
        },
    );
}

export async function recordCodeChanged(roomId: string, code: string) {
    await InterviewSessionModel.findOneAndUpdate({ roomId }, { finalCode: code });
}

export async function recordExecution(
    roomId: string,
    actor: Partial<Actor>,
    code: string,
    stdin: string,
    result: ExecutionResult,
    kind: "code" | "tests" = "code",
    testResults?: TestResult[],
) {
    const execution: InterviewExecution = {
        kind,
        ranBy: normalizeActor(actor),
        code,
        stdin,
        output: result.output,
        error: result.error,
        exitCode: result.exitCode,
        timedOut: result.timedOut,
        runtimeMs: result.runtimeMs,
        testResults,
        createdAt: new Date().toISOString(),
    };

    await InterviewSessionModel.findOneAndUpdate(
        { roomId },
        {
            $set: {
                finalCode: code,
                stdin,
            },
            $push: { executions: execution },
        },
    );
}

export async function recordRoomStatus(roomId: string, status: RoomStatus) {
    await InterviewSessionModel.findOneAndUpdate(
        { roomId },
        {
            $set: {
                status,
                ...(status === "inactive" ? { closedAt: new Date() } : {}),
            },
        },
    );
}

export async function listInterviewerHistory(actor: Partial<Actor>) {
    const actorClauses = sameActorQuery(actor);
    if (actorClauses.length === 0) return [];

    const docs = await InterviewSessionModel.find({
        $or: actorClauses.map((clause) =>
            Object.fromEntries(
                Object.entries(clause).map(([key, value]) => [`interviewer.${key}`, value]),
            ),
        ),
    })
        .sort({ updatedAt: -1 })
        .lean();

    return docs.map((doc) => toSummary(toSession(doc)));
}

export async function listCandidateHistory(actor: Partial<Actor>) {
    const actorClauses = sameActorQuery(actor);
    if (actorClauses.length === 0) return [];

    const docs = await InterviewSessionModel.find({
        $or: actorClauses.map((clause) =>
            Object.fromEntries(
                Object.entries(clause).map(([key, value]) => [`candidates.${key}`, value]),
            ),
        ),
    })
        .sort({ updatedAt: -1 })
        .lean();

    return docs.map((doc) => toSummary(toSession(doc)));
}

export async function getHistorySession(roomId: string, actor: Partial<Actor>) {
    const doc = await InterviewSessionModel.findOne({ roomId }).lean();
    if (!doc) return undefined;

    const session = toSession(doc);
    return sessionCanView(session, actor) ? session : undefined;
}
