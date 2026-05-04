import type { Room } from "@codedock/shared";

const rooms = new Map<string, Room>();

function generateRoomId(): string {
    return Math.random().toString(36).slice(2, 10);
}

function generateInviteCode(): string {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function createRoom(title: string, creatorSocketId: string): Room {
    const room: Room = {
        roomId: generateRoomId(),
        title,
        creatorSocketId,
        inviteCode: generateInviteCode(),
        createdAt: new Date().toISOString(),
    };

    rooms.set(room.roomId, room);
    return room;
}

export function getRoomById(roomId: string): Room | undefined {
    return rooms.get(roomId);
}

export function getRoomByInviteCode(inviteCode: string): Room | undefined {
    for (const room of rooms.values()) {
        if (room.inviteCode === inviteCode.toUpperCase()) {
            return room;
        }
    }
    return undefined;
}

export function setRoomPrompt(roomId: string, promptId: string | null): Room | undefined {
    const room = rooms.get(roomId);
    if (room) {
        room.selectedPromptId = promptId;
        return room;
    }
    return undefined;
}

export function setCreatorSocketId(roomId: string, socketId: string): void {
    const room = rooms.get(roomId);
    if (room) room.creatorSocketId = socketId;
}