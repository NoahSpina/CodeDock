// for later use when typing is concrete

export interface Participant {
    socketId: string;
    username: string;
}

export interface ChatMessage {
    socketId: string;
    username: string;
    message: string;
    sentAt: string;
}

export interface ExecutionRequest {
    language: "python";
    code: string;
    roomId: string;
}

export interface ExecutionResult {
    output: string;
    error: string;
    exitCode: number | null;
}