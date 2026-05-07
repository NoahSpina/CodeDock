import express from "express";
import cors from "cors";
import roomRoutes from "./routes/room.routes.js";
import promptRoutes from "./routes/prompts.js";
import historyRoutes from "./routes/history.routes.js";
import authRoutes from "./routes/auth.routes.js";
import { globalLimiter } from "./middleware/rateLimits.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "100kb" }));

app.use("/api", globalLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/prompts", promptRoutes);
app.use("/api/history", historyRoutes);

app.get("/", (_req, res) => {
    res.json({ message: "CodeDock server is running" });
});

export default app;
