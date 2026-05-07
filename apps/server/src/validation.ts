import { CODING_PROMPTS } from "./data/prompts.js";

const validateString = (value: unknown, varName: string): string => {
    if (value === undefined || value === null || value === "") {
        throw `You must provide a ${varName}`;
    }
    if (typeof value !== "string") {
        throw `${varName} must be a string`;
    }
    if (value.trim().length === 0) {
        throw `${varName} cannot be an empty string or just spaces`;
    }
    return value.trim();
};

export const validateUsername = (username: unknown): string => {
    const cleaned = validateString(username, "Username");
    if (cleaned.length < 3) throw "Username must be at least 3 characters long";
    if (cleaned.length > 30) throw "Username must be at most 30 characters long";
    if (!/^[A-Za-z0-9_]+$/.test(cleaned)) {
        throw "Username can only contain letters, numbers, and underscores";
    }
    return cleaned;
};

export const validateEmail = (email: unknown): string => {
    const cleaned = validateString(email, "Email");
    if (cleaned.length > 200) throw "Email must be at most 200 characters long";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
        throw "Invalid email format";
    }
    return cleaned.toLowerCase();
};

export const validatePassword = (password: unknown): string => {
    if (password === undefined || password === null || password === "") {
        throw "You must provide a Password";
    }
    if (typeof password !== "string") {
        throw "Password must be a string";
    }
    if (password.length < 6) throw "Password must be at least 6 characters long";
    if (password.length > 128) throw "Password must be at most 128 characters long";
    return password;
};

export const validateRoomTitle = (title: unknown): string => {
    const cleaned = validateString(title, "Room title");
    if (cleaned.length > 80) throw "Room title must be at most 80 characters long";
    return cleaned;
};

export const validateInviteCode = (code: unknown): string => {
    const cleaned = validateString(code, "Invite code").toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(cleaned)) {
        throw "Invite code must be 6 alphanumeric characters";
    }
    return cleaned;
};

export const validateRoomId = (roomId: unknown): string => {
    const cleaned = validateString(roomId, "Room ID");
    if (!/^[a-z0-9]{8}$/.test(cleaned)) {
        throw "Invalid room ID";
    }
    return cleaned;
};

export const validatePromptId = (promptId: unknown): string => {
    const cleaned = validateString(promptId, "Prompt ID");
    const exists = CODING_PROMPTS.some((p) => p.id === cleaned);
    if (!exists) throw "Unknown prompt ID";
    return cleaned;
};

export const validatePromptIdOrNull = (promptId: unknown): string | null => {
    if (promptId === null || promptId === undefined) return null;
    return validatePromptId(promptId);
};

export const validateCode = (code: unknown): string => {
    if (typeof code !== "string") throw "Code must be a string";
    if (code.length === 0) throw "You must provide Code";
    if (code.length > 20000) throw "Code must be at most 20000 characters long";
    return code;
};

export const validateStdin = (input: unknown): string => {
    if (input === undefined || input === null) return "";
    if (typeof input !== "string") throw "Input must be a string";
    if (input.length > 10000) throw "Input must be at most 10000 characters long";
    return input;
};

export const validateChatMessage = (message: unknown): string => {
    const cleaned = validateString(message, "Message");
    if (cleaned.length > 1000) throw "Message must be at most 1000 characters long";
    return cleaned;
};

export const validateLanguage = (language: unknown): "python" => {
    const cleaned = validateString(language, "Language");
    if (cleaned !== "python") throw "Language must be 'python'";
    return cleaned;
};

export const validateRoomStatus = (status: unknown): "active" | "inactive" => {
    const cleaned = validateString(status, "Status");
    if (cleaned !== "active" && cleaned !== "inactive") {
        throw "Status must be active or inactive";
    }
    return cleaned;
};

export const validateGuestId = (guestId: unknown): string | undefined => {
    if (guestId === undefined || guestId === null || guestId === "") return undefined;
    if (typeof guestId !== "string") throw "Guest ID must be a string";
    const cleaned = guestId.trim();
    if (cleaned.length === 0) return undefined;
    if (cleaned.length > 64) throw "Guest ID must be at most 64 characters";
    if (!/^[A-Za-z0-9_-]+$/.test(cleaned)) {
        throw "Guest ID can only contain letters, numbers, underscores, and dashes";
    }
    return cleaned;
};

export const asMongooseValidator =
    (fn: (value: unknown) => unknown) =>
    (value: unknown): boolean => {
        try {
            fn(value);
            return true;
        } catch (err) {
            throw new Error(typeof err === "string" ? err : "Invalid value");
        }
    };
