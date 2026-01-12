import type { Request, Response } from "express";
import { storage } from "../..";

export const stravaCallback = async (req: Request, res: Response) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.send(`Authorization failed: ${error}`);
  }

  if (!code || !state) {
    return res.send("Missing authorization code or state");
  }

  const discordUserId = await storage.get(`state:${state}`);

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

    await storage.set(`user:${discordUserId}`, {
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      expires_at: token.expires_at,
      athlete_id: token.athlete.id,
      athlete_name: `${token.athlete.firstname} ${token.athlete.lastname}`,
    });

    await storage.set(`athlete:${token.athlete.id}`, discordUserId);
    await storage.del(`state:${state}`);

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
};
