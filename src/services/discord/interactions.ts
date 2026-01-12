import type { Request, Response } from "express";
import { storage } from "../..";
import {
  InteractionResponseFlags,
  InteractionResponseType,
  InteractionType,
} from "discord-interactions";

export async function handleDiscordInteractions(req: Request, res: Response) {
  try {
    const { type, data, member, user } = req.body;

    /**
     * Handle verification requests
     */
    if (type === InteractionType.PING) {
      return res.send({ type: InteractionResponseType.PONG });
    }

    // Handle slash commands
    if (type === InteractionType.APPLICATION_COMMAND) {
      const discordUser = member?.user || user;

      // /connect-strava
      if (data.name === "connect-strava") {
        const authUrl = `${process.env.WEB_APP_URL}/auth/start/${discordUser.id}`;

        return res.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `🔗 Click here to connect your Strava account:\n${authUrl}\n\nThis link expires in 15 minutes.`,
            flags: InteractionResponseFlags.EPHEMERAL,
          },
        });
      }

      // /disconnect-strava
      if (data.name === "disconnect-strava") {
        const userData = await storage.get(`user:${discordUser.id}`);
        console.log("User data to disconnect:", userData);

        if (userData) {
          try {
            // Deauthorize from Strava FIRST
            const deauthResponse = await fetch(
              `https://www.strava.com/oauth/deauthorize?access_token=${userData.access_token}`,
              { method: "POST" }
            );

            if (!deauthResponse.ok) {
              console.error(
                "Failed to deauthorize from Strava:",
                await deauthResponse.text()
              );
              // Continue anyway to clean up local data
            } else {
              console.log("Successfully deauthorized from Strava");
            }
          } catch (error) {
            console.error("Error deauthorizing from Strava:", error);
            // Continue anyway to clean up local data
          }
          await storage.del(`athlete:${userData.athlete_id}`);
          await storage.del(`user:${discordUser.id}`);

          return res.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: "✅ Your Strava account has been disconnected.",
              flags: InteractionResponseFlags.EPHEMERAL,
            },
          });
        } else {
          return res.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: "❌ You don't have a Strava account connected.",
              flags: InteractionResponseFlags.EPHEMERAL,
            },
          });
        }
      }

      // /strava-status
      if (data.name === "strava-status") {
        const userData = await storage.get(`user:${discordUser.id}`);

        if (userData) {
          return res.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `✅ Connected as: **${userData.athlete_name}**`,
              flags: InteractionResponseFlags.EPHEMERAL,
            },
          });
        } else {
          return res.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content:
                "❌ No Strava account connected. Use `/connect-strava` to link your account.",
              flags: InteractionResponseFlags.EPHEMERAL,
            },
          });
        }
      }
    }

    res.status(400).send("Unknown interaction type");
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to connect Strava" });
  }
}
