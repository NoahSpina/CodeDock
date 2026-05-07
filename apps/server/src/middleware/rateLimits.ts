import rateLimit from "express-rate-limit";
import type { Request } from "express";
import type { AuthRequest } from "./auth.js";

const userIdKey = (req: Request): string => {
    const authReq = req as AuthRequest;
    return authReq.user?.userId ?? req.ip ?? "unknown";
};

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many authentication attempts. Try again later." },
});

export const roomCreateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    keyGenerator: userIdKey,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many rooms created. Try again later." },
});

export const roomJoinLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many join attempts. Try again later." },
});

export const runLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    keyGenerator: userIdKey,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many code executions. Try again later." },
});

export const readLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests. Try again later." },
});

export const globalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests. Try again later." },
});
