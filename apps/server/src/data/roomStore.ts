import type { Room } from "@codedock/shared";

const rooms = new Map<string, Room>();

function generateRoomId(): string {
    return Math.random().toString(36).slice(2, 10);
}

function generateInviteCode(): string {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function createRoom(title: string): Room {
    const room: Room = {
        roomId: generateRoomId(),
        title,
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
