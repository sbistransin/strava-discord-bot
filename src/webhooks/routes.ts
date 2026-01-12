import { Router } from "express";
import { processStravaWebhookEvent, verifyStravaWebhook } from "./handler";

const router = Router();

// ==================== STRAVA WEBHOOK ENDPOINTS ====================
router.get("/", verifyStravaWebhook);
router.post("/", processStravaWebhookEvent);

export default router;
