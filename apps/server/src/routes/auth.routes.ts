import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

const router = Router();

router.post("/signup", async (req, res) => {
    const { username, email, password } = req.body as {
        username?: string;
        email?: string;
        password?: string;
    };

    if (!username || !email || !password) {
        return res
            .status(400)
            .json({ error: "username, email, and password are required" });
    }

    if (password.length < 6) {
        return res
            .status(400)
            .json({ error: "Password must be at least 6 characters" });
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

router.post("/login", async (req, res) => {
    const { email, password } = req.body as {
        email?: string;
        password?: string;
    };

    if (!email || !password) {
        return res
            .status(400)
            .json({ error: "email and password are required" });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res
                .status(401)
                .json({ error: "Invalid email or password" });
        }

        const match = await bcrypt.compare(password, user.passwordHash);
        if (!match) {
            return res
                .status(401)
                .json({ error: "Invalid email or password" });
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