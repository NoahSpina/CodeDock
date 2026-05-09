export interface Participant {
    socketId: string;
    username: string;
    guestId?: string;
}

export type RoomStatus = "active" | "inactive";

export interface Actor {
    userId?: string;
    guestId?: string;
    username: string;
}

export interface Room {
    roomId: string;
    title: string;
    inviteCode: string;
    createdAt: string;
    creatorSocketId: string;
    creatorGuestId?: string;
    creatorUsername?: string;
    selectedPromptId: string | null;
    status: RoomStatus;
}

export interface ChatMessage {
    socketId: string;
    username: string;
    message: string;
    sentAt: string;
}

export interface JoinRoomPayload {
    roomId: string;
    username: string;
    guestId?: string;
}

export interface ChatMessagePayload {
    roomId: string;
    username: string;
    message: string;
}

export interface CodeChangePayload {
    roomId: string;
    code: string;
    guestId?: string;
}

export interface CodeChangeMessage {
    code: string;
}

export interface ExecutionRequest {
    language: "python";
    code: string;
    roomId?: string;
    promptId?: string | null;
    input?: string;
    userId?: string;
    username?: string;
    guestId?: string;
}

export interface ExecutionResult {
    output: string;
    error: string;
    exitCode: number | null;
    timedOut?: boolean;
    runtimeMs?: number;
}

export interface ExecutionFinishedMessage {
    output: string;
    error: string;
    exitCode: number | null;
    ranBy: string;
    sentAt: string;
    timedOut?: boolean;
    runtimeMs?: number;
}

export interface TestRunFinishedMessage {
    results: TestResult[];
    error?: string;
    ranBy: string;
    sentAt: string;
    runtimeMs?: number;
}

export interface StdinChangePayload {
    roomId: string;
    stdin: string;
    guestId?: string;
}

export interface EndInterviewPayload {
    roomId: string;
    code: string;
    stdin: string;
}

export interface ClientToServerEvents {
    "room:join": (payload: JoinRoomPayload) => void;
    "room:chat-message": (payload: ChatMessagePayload) => void;
    "room:code-change": (payload: CodeChangePayload) => void;
    "room:stdin-change": (payload: StdinChangePayload) => void;
    "room:end-interview": (payload: EndInterviewPayload) => void;
    "prompt:select": (payload: { roomId: string; promptId: string }) => void;
    "prompt:clear": (payload: { roomId: string }) => void;
}

export interface ServerToClientEvents {
    "room:participants": (participants: Participant[]) => void;
    "room:chat-message": (message: ChatMessage) => void;
    "room:code-change": (payload: CodeChangeMessage) => void;
    "room:stdin-change": (payload: { stdin: string }) => void;
    "room:execution-result": (payload: ExecutionFinishedMessage) => void;
    "room:test-results": (payload: TestRunFinishedMessage) => void;
    "prompt:updated": (payload: { promptId: string | null; prompt: CodingPrompt | null }) => void;
    "room:joined": (payload: { isCreator: boolean; code: string; stdin: string }) => void;
    "room:status-change": (payload: { status: RoomStatus }) => void;
    "room:validation-error": (payload: { event: string; message: string }) => void;
}

export interface TestCase {
    args: unknown[];
    expected: unknown;
    hidden: boolean;
}

export interface CodingPrompt {
    id: string;
    title: string;
    difficulty: "Easy" | "Medium" | "Hard";
    category: string;
    description: string;
    examples: { input: string; output: string; explanation?: string }[];
    constraints: string[];
    starterCode: string;
    functionName: string;
    stdinAdapter: string;
    testCases: TestCase[];
}

export interface TestResult {
    index: number;
    passed: boolean;
    result: unknown;
    expected: unknown;
    error: string | null;
}

export interface InterviewExecution {
    kind?: "code" | "tests";
    ranBy: Actor;
    code: string;
    stdin: string;
    output: string;
    error: string;
    exitCode: number | null;
    timedOut?: boolean;
    runtimeMs?: number;
    testResults?: TestResult[];
    createdAt: string;
}

export interface InterviewSession {
    roomId: string;
    title: string;
    inviteCode: string;
    status: RoomStatus;
    interviewer: Actor;
    candidates: Actor[];
    selectedPromptId: string | null;
    selectedPrompt?: CodingPrompt | null;
    finalCode: string;
    stdin: string;
    executions: InterviewExecution[];
    createdAt: string;
    updatedAt: string;
    closedAt?: string;
}

export interface InterviewHistorySummary {
    roomId: string;
    title: string;
    inviteCode: string;
    status: RoomStatus;
    interviewer: Actor;
    candidates: Actor[];
    selectedPromptId: string | null;
    selectedPromptTitle?: string;
    lastExecution?: InterviewExecution;
    createdAt: string;
    updatedAt: string;
    closedAt?: string;
}
