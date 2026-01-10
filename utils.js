// ==================== HELPER FUNCTIONS ====================

export async function ensureValidToken(discordUserId, userData) {
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

    await kv.set(`user:${discordUserId}`, updatedData);

    return newTokens.access_token;
  }

  return userData.access_token;
}

export async function fetchActivity(activityId, accessToken) {
  const response = await fetch(
    `https://www.strava.com/api/v3/activities/${activityId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  return await response.json();
}

export async function sendDiscordDM(discordUserId, activity) {
  try {
    // Format activity message
    const distanceMiles = (activity.distance * 0.00062137).toFixed(2);
    const durationMin = Math.floor(activity.moving_time / 60);
    const paceMinPerKm =
      activity.type === "Run"
        ? (activity.moving_time / 60 / (activity.distance / 1000)).toFixed(2)
        : null;

    let message = `🏃 **New ${activity.type} from <@${discordUserId}>!**\n\n`;
    message += `**${activity.name}**\n`;
    message += `📏 Distance: ${distanceMiles} miles\n`;
    message += `⏱️ Time: ${durationMin} min\n`;
    if (paceMinPerKm) {
      message += `⚡ Pace: ${paceMinPerKm} min/km\n`;
    }
    if (activity.total_elevation_gain) {
      message += `⛰️ Elevation: ${Math.round(
        activity.total_elevation_gain
      )} m\n`;
    }

    // Send message
    const response = await fetch(
      `https://discord.com/api/v10/channels/${process.env.DISCORD_FITNESS_CHANNEL_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: message }),
      }
    );

    if (!response.ok) {
      console.error("Failed to send message:", await response.text());
    } else {
      console.log(`Sent activity notification for ${activity.name}`);
    }
  } catch (error) {
    console.error("Error sending Discord DM:", error);
  }
}
