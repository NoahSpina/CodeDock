import type { Participant } from "@codedock/shared";

const roomParticipants = new Map<string, Participant[]>();

export function addParticipant(roomId: string, participant: Participant) {
    const existing = roomParticipants.get(roomId) || [];

    const filtered = existing.filter((p) => p.socketId !== participant.socketId);
    filtered.push(participant);

    roomParticipants.set(roomId, filtered);
}

export function removeParticipant(socketId: string) {
    for (const [roomId, participants] of roomParticipants.entries()) {
        const nextParticipants = participants.filter((p) => p.socketId !== socketId);

        if (nextParticipants.length !== participants.length) {
            if (nextParticipants.length === 0) {
                roomParticipants.delete(roomId);
            } else {
                roomParticipants.set(roomId, nextParticipants);
            }

            return roomId;
        }
    }

    return null;
}

export function getParticipants(roomId: string) {
    return roomParticipants.get(roomId) || [];
}
