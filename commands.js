import dotenv from "dotenv";
dotenv.config();

const DISCORD_COMMANDS = [
  {
    name: "connect-strava",
    description: "Connect your Strava account to receive activity updates",
  },
  {
    name: "disconnect-strava",
    description: "Disconnect your Strava account",
  },
  {
    name: "strava-status",
    description: "Check if your Strava account is connected",
  },
];

export async function makeDiscordRequest(url, options) {
   
  if (options.body) options.body = JSON.stringify(options.body);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
      "Content-Type": "application/json; charset=UTF-8",
      "User-Agent":
        "DiscordBot (https://github.com/sbistransin/strava-discord-bot, 1.0.0)",
    },
    ...options,
  });

  if (!response.ok) {
    const data = await response.json();
    console.log(response.status);
    console.error("❌ Failed to register commands:", error);
    throw new Error(JSON.stringify(data));
  } else {
    const data = await response.json();
    console.log("✅ Successfully registered commands:");
    data.forEach((cmd) => console.log(`  - /${cmd.name}`));
  }
  // return original response
  return response;
}

/**
 * Calls Discord API to install global commands
 * https://discord.com/developers/docs/interactions/application-commands#bulk-overwrite-global-application-commands
 * @param {*} appId Application ID of discord bot
 * @param {*} commands List of commands to install
 */
export async function installGlobalCommands(appId, commands) {
   const url = `https://discord.com/api/v10/applications/${process.env.DISCORD_APPLICATION_ID}/commands`;

  try {
    await makeDiscordRequest(url, { method: "PUT", body: commands });
  } catch (err) {
    console.error(err);
  }
}

installGlobalCommands(process.env.DISCORD_APPLICATION_ID, DISCORD_COMMANDS);
