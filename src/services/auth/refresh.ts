import { storage } from "../..";
import { VercelUserData } from "../../storage/types";

export async function ensureValidToken(
  discordUserId: string,
  userData: VercelUserData
) {
  const now = Math.floor(Date.now() / 1000);

  if (userData.expires_at < now + 300) {
    console.log(`Refreshing token for user ${discordUserId}`);

    const refreshResponse = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        refresh_token: userData.refresh_token,
        grant_type: "refresh_token",
      }),
    });

    const newTokens = await refreshResponse.json();

    const updatedData = {
      ...userData,
      access_token: newTokens.access_token,
      refresh_token: newTokens.refresh_token,
      expires_at: newTokens.expires_at,
    };

    await storage.set(`user:${discordUserId}`, updatedData);

    return newTokens.access_token;
  }

  return userData.access_token;
}
