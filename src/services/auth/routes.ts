import { Router } from "express";

import { stravaCallback } from "./callback";
import { stravaConnect } from "./connect";

const router = Router();

// ==================== STRAVA OAUTH ENDPOINTS ====================
router.get("/start/:discordUserId", stravaConnect);
router.get("/callback", stravaCallback);

export default router;
