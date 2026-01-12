import { storage } from "../..";
import { StravaApiClient } from "../../clients/strava/client";
import { VercelUserData } from "../../storage/types";

export async function refreshTokenIfNeeded(
  discordUserId: string,
  userData: VercelUserData,
  stravaClient?: StravaApiClient
) {
  if (!stravaClient) {
    stravaClient = new StravaApiClient();
  }

  const now = Math.floor(Date.now() / 1000);

  if (userData.expires_at < now + 300) {
    console.log(`Refreshing token for user ${discordUserId}`);

    const newTokens = await stravaClient.refreshToken(userData.refresh_token);

    const updatedData = {
      ...userData,
      access_token: newTokens.access_token,
      refresh_token: newTokens.refresh_token,
      expires_at: newTokens.expires_at.toString(),
    };

    await storage.set(`user:${discordUserId}`, updatedData);

    return newTokens.access_token;
  }

  return userData.access_token;
}
