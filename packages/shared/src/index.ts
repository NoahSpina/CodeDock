export interface ChatMessage {
    senderId: string;
    senderName: string;
    message: string;
    timestamp: string;
}

export interface ExecutionRequest {
    language: "python";
    code: string;
    stdin?: string;
    roomId: string;
    sessionId: string;
    submittedBy: string;
}

export interface ExecutionResult {
    stdout: string;
    stderr: string;
    exitCode: number;
    runtimeMs: number;
    timedOut: boolean;
    createdAt: string;
}