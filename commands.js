import dotenv from "dotenv";
dotenv.config();

const COMMANDS = [
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

export async function DiscordRequest(endpoint, options) {
  // append endpoint to root API URL
  const url = "https://discord.com/api/v10/" + endpoint;
  // Stringify payloads
  if (options.body) options.body = JSON.stringify(options.body);
  // Use fetch to make requests
  const res = await fetch(url, {
    headers: {
      Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
      "Content-Type": "application/json; charset=UTF-8",
      "User-Agent":
        "DiscordBot (https://github.com/discord/discord-example-app, 1.0.0)",
    },
    ...options,
  });
  // throw API errors
  if (!res.ok) {
    const data = await res.json();
    console.log(res.status);
    console.error("❌ Failed to register commands:", error);
    throw new Error(JSON.stringify(data));
  } else {
    const data = await res.json();
    console.log("✅ Successfully registered commands:");
    data.forEach((cmd) => console.log(`  - /${cmd.name}`));
  }
  // return original response
  return res;
}

export async function InstallGlobalCommands(appId, commands) {
  // API endpoint to overwrite global commands
  const endpoint = `applications/${appId}/commands`;

  try {
    // This is calling the bulk overwrite endpoint: https://discord.com/developers/docs/interactions/application-commands#bulk-overwrite-global-application-commands
    await DiscordRequest(endpoint, { method: "PUT", body: commands });
  } catch (err) {
    console.error(err);
  }
}

InstallGlobalCommands(process.env.DISCORD_APPLICATION_ID, COMMANDS);
