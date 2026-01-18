import { verifyKeyMiddleware } from "discord-interactions";
import dotenv from "dotenv";
import express from "express";
import authRoutes from "./services/auth/routes";
import { handleDiscordInteractions } from "./services/discord/interactions";
import webhookRoutes from "./webhooks/routes";

dotenv.config();
const app = express();

if (!process.env.DISCORD_PUBLIC_KEY) {
  console.error("Missing DISCORD_PUBLIC_KEY in environment variables");
  process.exit(1);
}

if (!process.env.STRAVA_REDIRECT_URI) {
  console.error("Missing STRAVA_REDIRECT_URI in environment variables");
  process.exit(1);
}

// ==================== LOCAL STORAGE FOR TESTING ====================
const storageMap = new Map();

export const storage = {
  async get(key: string) {
    return storageMap.get(key) || null;
  },
  async set(
    key: string,
    value: Record<string, string> | string,
    options?: { ex?: number }
  ) {
    storageMap.set(key, value);
    if (options?.ex) {
      setTimeout(() => storageMap.delete(key), options.ex * 1000);
    }
  },
  async del(key: string) {
    storageMap.delete(key);
  },
};

app.post(
  "/interactions",
  verifyKeyMiddleware(process.env.DISCORD_PUBLIC_KEY),
  handleDiscordInteractions
);
app.use("/auth", authRoutes);

app.use(express.json());
app.use("/webhook", webhookRoutes);

// Health check
app.get("/", (req, res) => {
  res.send("Strava Discord Bot API is running!");
});

// For local development
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 80;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
