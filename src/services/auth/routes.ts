import { Router } from "express";

import { stravaConnect } from "./connect";
import { stravaCallback } from "./callback";

const router = Router();

// ==================== STRAVA OAUTH ENDPOINTS ====================
router.get("/start/:discordUserId", stravaConnect);
router.get("/callback", stravaCallback);

export default router;
