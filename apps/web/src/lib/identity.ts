import type { Actor } from "@codedock/shared";

const GUEST_ID_KEY = "codedock_guest_id";
const USERNAME_KEY = "codedock_username";

function createGuestId() {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID();
    }

    return `guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getOrCreateActor(): Actor {
    let guestId = window.localStorage.getItem(GUEST_ID_KEY);
    let username = window.localStorage.getItem(USERNAME_KEY);

    if (!guestId) {
        guestId = createGuestId();
        window.localStorage.setItem(GUEST_ID_KEY, guestId);
    }

    if (!username) {
        username = `User-${Math.floor(Math.random() * 1000)}`;
        window.localStorage.setItem(USERNAME_KEY, username);
    }

    return { guestId, username };
}

