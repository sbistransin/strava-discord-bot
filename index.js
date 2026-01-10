import express from "express";
import bodyParser from "body-parser";
import crypto from "crypto";
import {
  InteractionResponseFlags,
  InteractionResponseType,
  InteractionType,
  verifyKeyMiddleware,
} from "discord-interactions";
import dotenv from "dotenv";
import { ensureValidToken, fetchActivity, sendDiscordDM } from "./utils.js";

dotenv.config();
const app = express();

// ==================== LOCAL STORAGE FOR TESTING ====================
const storage = new Map();

const kv = {
  async get(key) {
    return storage.get(key) || null;
  },
  async set(key, value, options) {
    storage.set(key, value);
    if (options?.ex) {
      setTimeout(() => storage.delete(key), options.ex * 1000);
    }
  },
  async del(key) {
    storage.delete(key);
  },
};

// ==================== DISCORD INTERACTIONS ====================

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 */
app.post(
  "/interactions",
  verifyKeyMiddleware(process.env.DISCORD_PUBLIC_KEY),
  async (req, res) => {
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
        const userData = await kv.get(`user:${discordUser.id}`);
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
          await kv.del(`athlete:${userData.athlete_id}`);
          await kv.del(`user:${discordUser.id}`);

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
        const userData = await kv.get(`user:${discordUser.id}`);

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
  }
);

// ==================== STRAVA WEBHOOK ENDPOINTS ====================

app.use(bodyParser.json());

// Creates the endpoint for our webhook
app.post("/webhook", (req, res) => {
  // Stravea requires a 200 response within 2 seconds
  res.status(200).send("EVENT_RECEIVED");

  Promise.resolve()
    .then(async () => {
      try {
        const event = req.body;

        /** Keeping update aspect type for testing atm */
        if (
          event.object_type === "activity" &&
          (event.aspect_type === "create" || event.aspect_type === "update")
        ) {
          const athleteId = event.owner_id;
          const activityId = event.object_id;

          // Look up Discord user
          const discordUserId = await kv.get(`athlete:${athleteId}`);

          if (discordUserId) {
            const userData = await kv.get(`user:${discordUserId}`);

            if (userData) {
              // Ensure token is valid
              const validToken = await ensureValidToken(
                discordUserId,
                userData
              );

              // Fetch activity details
              const activity = await fetchActivity(activityId, validToken);

              // Send Discord DM
              await sendDiscordDM(discordUserId, activity);
            }
          }
        }
      } catch (error) {
        console.error("Error processing webhook:", error);
      }
    })
    .catch((error) => {
      console.error("Error:", error);
    });
});

// Adds support for GET requests to our webhook
app.get("/webhook", (req, res) => {
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
});

// ==================== STRAVA OAUTH ENDPOINTS ====================

app.get("/auth/start/:discordUserId", async (req, res) => {
  const discordUserId = req.params.discordUserId;

  const state = crypto.randomBytes(16).toString("hex");
  await kv.set(`state:${state}`, discordUserId, { ex: 900 });

  const authUrl =
    `https://www.strava.com/oauth/authorize?` +
    `client_id=${process.env.STRAVA_CLIENT_ID}&` +
    `response_type=code&` +
    `redirect_uri=${encodeURIComponent(process.env.STRAVA_REDIRECT_URI)}&` +
    `scope=activity:read_all,read&` +
    `state=${state}`;

  res.redirect(authUrl);
});

app.get("/auth/callback", async (req, res) => {
  const { code, scope, state, error } = req.query;

  if (error) {
    return res.send(`Authorization failed: ${error}`);
  }

  if (!code || !state) {
    return res.send("Missing authorization code or state");
  }

  const discordUserId = await kv.get(`state:${state}`);

  if (!discordUserId) {
    return res.send(
      "Authorization expired or invalid. Please try again from Discord."
    );
  }

  try {
    const tokenResponse = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
      }),
    });

    const token = await tokenResponse.json();

    if (token.errors) {
      console.error("Token exchange error:", token);
      return res.send("Failed to connect to Strava. Please try again.");
    }

    await kv.set(`user:${discordUserId}`, {
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      expires_at: token.expires_at,
      athlete_id: token.athlete.id,
      athlete_name: `${token.athlete.firstname} ${token.athlete.lastname}`,
    });

    await kv.set(`athlete:${token.athlete.id}`, discordUserId);
    await kv.del(`state:${state}`);

    console.log(
      `User ${discordUserId} connected Strava athlete ${token.athlete.id}`
    );

    res.send(`
        <html>
          <head>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              }
              .container {
                background: white;
                padding: 3rem;
                border-radius: 1rem;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                text-align: center;
                max-width: 400px;
              }
              h1 { color: #2d3748; margin: 0 0 1rem 0; }
              p { color: #4a5568; margin: 0.5rem 0; }
              .emoji { font-size: 4rem; margin-bottom: 1rem; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="emoji">✅</div>
              <h1>Connected!</h1>
              <p>Your Strava account has been linked.</p>
              <p>You can close this window and return to Discord.</p>
            </div>
          </body>
        </html>
      `);
  } catch (error) {
    console.error("OAuth callback error:", error);
    res.send("An error occurred during authorization. Please try again.");
  }
});

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
