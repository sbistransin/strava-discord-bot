import type { Request, Response } from "express";

import { refreshTokenIfNeeded } from "../services/auth/refresh";
import { sendStravaActivityToDiscord } from "../services/discord/discord";
import { storage } from "..";
import { StravaApiClient } from "../clients/strava/client";

type StravaWebhookEvent = {
  aspect_type: "create" | "update";
  object_id: string;
  object_type: "activity";
  owner_id: number;
  susbcription_id: number;
};

/**
 * Processes a Strava webhook event.
 *
 * @param event StravaWebhookEvent
 */
export const processStravaWebhookEvent = async (
  req: Request,
  res: Response
) => {
  // todo add verification of the webhook signature
  console.log("Received webhook event:", req.body);
  try {
    const event = req.body as StravaWebhookEvent;
    /** Keeping update aspect type for testing atm */
    if (
      event.object_type === "activity" &&
      (event.aspect_type === "create" || event.aspect_type === "update")
    ) {
      const athleteId = event.owner_id;
      const activityId = event.object_id;

      // Look up Discord user
      const discordUserId = await storage.get(`athlete:${athleteId}`);

      if (discordUserId) {
        const userData = await storage.get(`user:${discordUserId}`);

        if (userData) {
          // Ensure token is valid
          const stravaClient = new StravaApiClient();
          const validToken = await refreshTokenIfNeeded(
            discordUserId,
            userData,
            stravaClient
          );

          // Fetch activity details
          const activity = await stravaClient.getActivity(
            activityId,
            validToken
          );

          // Send Discord DM
          await sendStravaActivityToDiscord(discordUserId, activity);
        }
      }
    }

    // Stravea requires a 200 response within 2 seconds... so I might need
    // to use an event stream for webhook processing
    res.status(200).send("EVENT_RECEIVED");
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(200).json({ success: true });
  }
};

/**
 * Verifies Strava webhook.
 *
 * @param event StravaWebhookEvent
 */
export const verifyStravaWebhook = async (req: Request, res: Response) => {
  try {
    // Your verify token. Should be a random string.
    const VERIFY_TOKEN = "STRAVA";
    // Parses the query params
    let mode = req.query["hub.mode"];
    let token = req.query["hub.verify_token"];
    let challenge = req.query["hub.challenge"];
    // Checks if a token and mode is in the query string of the request
    if (mode && token) {
      // Verifies that the mode and token sent are valid
      if (mode === "subscribe" && token === VERIFY_TOKEN) {
        // Responds with the challenge token from the request
        console.log("WEBHOOK_VERIFIED");
        res.json({ "hub.challenge": challenge });
      } else {
        // Responds with '403 Forbidden' if verify tokens do not match
        res.sendStatus(403);
      }
    }
  } catch (error) {
    console.error("Strava Webhook error:", error);
    res.status(200).json({ success: true });
  }
};
