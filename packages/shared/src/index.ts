export interface Participant {
    socketId: string;
    username: string;
}

export interface Room {
    roomId: string;
    title: string;
    inviteCode: string;
    createdAt: string;
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
}

export interface ChatMessagePayload {
    roomId: string;
    username: string;
    message: string;
}

export interface CodeChangePayload {
    roomId: string;
    code: string;
}

export interface CodeChangeMessage {
    code: string;
}

export interface ExecutionRequest {
    language: "python";
    code: string;
    roomId?: string;
}

export interface ExecutionResult {
    output: string;
    error: string;
    exitCode: number | null;
}

export interface ClientToServerEvents {
    "room:join": (payload: JoinRoomPayload) => void;
    "room:chat-message": (payload: ChatMessagePayload) => void;
    "room:code-change": (payload: CodeChangePayload) => void;
}

export interface ServerToClientEvents {
    "room:participants": (participants: Participant[]) => void;
    "room:chat-message": (message: ChatMessage) => void;
    "room:code-change": (payload: CodeChangeMessage) => void;
}
