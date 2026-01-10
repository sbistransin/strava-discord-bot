import express from "express";
import bodyParser from "body-parser";

const app = express().use(bodyParser.json());

// Creates the endpoint for our webhook
app.post("/webhook", (req, res) => {
  console.log("webhook event received!", req.query, req.body);
  res.status(200).send("EVENT_RECEIVED");
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
  const { code, state, error } = req.query;

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
        code: code,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenResponse.json();

    if (tokens.errors) {
      console.error("Token exchange error:", tokens);
      return res.send("Failed to connect to Strava. Please try again.");
    }

    await kv.set(`user:${discordUserId}`, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expires_at,
      athlete_id: tokens.athlete.id,
      athlete_name: `${tokens.athlete.firstname} ${tokens.athlete.lastname}`,
    });

    await kv.set(`athlete:${tokens.athlete.id}`, discordUserId);
    await kv.del(`state:${state}`);

    console.log(
      `User ${discordUserId} connected Strava athlete ${tokens.athlete.id}`
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
