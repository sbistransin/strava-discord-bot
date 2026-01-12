import { DiscordApiClient } from "../../clients/discord/client";
import { StravaActivity } from "../../clients/strava/types";

export async function sendStravaActivityToDiscord(
  discordUserId: string,
  activity: StravaActivity
) {
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
    message += `⛰️ Elevation: ${Math.round(activity.total_elevation_gain)} m\n`;
  }

  const discord = new DiscordApiClient();
  if (!process.env.DISCORD_FITNESS_CHANNEL_ID) {
    throw new Error("DISCORD_FITNESS_CHANNEL_ID is not set");
  }

  await discord.sendMessage(process.env.DISCORD_FITNESS_CHANNEL_ID, message);
}
