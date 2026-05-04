import express from "express";
import cors from "cors";
import roomRoutes from "./routes/room.routes.js";
import promptRoutes from "./routes/prompts.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/rooms", roomRoutes);
app.use("/api/prompts", promptRoutes);

app.get("/", (_req, res) => {
    res.json({ message: "CodeDock server is running" });
});

export default app;