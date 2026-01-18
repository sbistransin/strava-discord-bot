import { randomBytes } from "crypto";
import type { Request, Response } from "express";
import { StravaApiClient } from "../../clients/strava/client";
import { kv } from "@vercel/kv";

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
    await kv.set(`state:${state}`, discordUserId, {
      ex: 900,
    });
    const stravaClient = new StravaApiClient();
    const authUrl = await stravaClient.getAuthorizeUrl(state);

    res.redirect(authUrl);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to connect Strava" });
  }
}
