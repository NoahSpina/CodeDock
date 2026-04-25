import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
    res.json({
        ok: true,
        message: "CodeDock server is healthy",
    });
});

export default router;