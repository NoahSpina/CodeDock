import express from "express";
import cors from "cors";
import healthRoutes from "./routes/health.routes.js";
import roomRoutes from "./routes/room.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/health", healthRoutes);
app.use("/api/rooms", roomRoutes);

app.get("/", (_req, res) => {
    res.json({ message: "CodeDock server is running" });
});

export default app;