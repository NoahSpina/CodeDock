import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import {
    validateEmail,
    validatePassword,
    validateUsername,
} from "../validation.js";
import { authLimiter } from "../middleware/rateLimits.js";

const router = Router();

router.post("/signup", authLimiter, async (req, res) => {
    let username: string;
    let email: string;
    let password: string;
    try {
        username = validateUsername(req.body?.username);
        email = validateEmail(req.body?.email);
        password = validatePassword(req.body?.password);
    } catch (err) {
        return res
            .status(400)
            .json({ error: typeof err === "string" ? err : "Invalid input" });
    }

    try {
        const existing = await User.findOne({ $or: [{ username }, { email }] });
        if (existing) {
            return res
                .status(400)
                .json({ error: "Username or email already taken" });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const user = await User.create({ username, email, passwordHash });

        const secret = process.env.JWT_SECRET || "change-me";
        const token = jwt.sign(
            { userId: user._id.toString(), username: user.username },
            secret,
            { expiresIn: "7d" }
        );

        return res.status(201).json({ token, username: user.username });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Something went wrong" });
    }
});

router.post("/login", authLimiter, async (req, res) => {
    let email: string;
    let password: string;
    try {
        email = validateEmail(req.body?.email);
        password = validatePassword(req.body?.password);
    } catch (err) {
        return res
            .status(400)
            .json({ error: typeof err === "string" ? err : "Invalid input" });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const match = await bcrypt.compare(password, user.passwordHash);
        if (!match) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const secret = process.env.JWT_SECRET || "change-me";
        const token = jwt.sign(
            { userId: user._id.toString(), username: user.username },
            secret,
            { expiresIn: "7d" }
        );

        return res.json({ token, username: user.username });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Something went wrong" });
    }
});

export default router;
