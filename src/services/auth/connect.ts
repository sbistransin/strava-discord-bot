import type { Request, Response } from "express";
import { randomBytes } from "crypto";
import { storage } from "../..";

type Params = {
  discordUserId: string;
};

export async function stravaConnect(req: Request<Params>, res: Response) {
  try {
    if (!process.env.STRAVA_REDIRECT_URI) {
      console.error("Missing STRAVA_REDIRECT_URI in environment variables");
      // what should i send here
      process.exit(1);
    }

    const discordUserId = req.params.discordUserId;

    const state = randomBytes(16).toString("hex");
    await storage.set(`state:${state}`, discordUserId, {
      ex: 900,
    });

    const authUrl =
      `https://www.strava.com/oauth/authorize?` +
      `client_id=${process.env.STRAVA_CLIENT_ID}&` +
      `response_type=code&` +
      `redirect_uri=${encodeURIComponent(process.env.STRAVA_REDIRECT_URI!)}&` +
      `scope=activity:read_all,read&` +
      `state=${state}`;

    res.redirect(authUrl);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to connect Strava" });
  }
}
