import * as dotenv from "dotenv";
import { DiscordApiClient } from "../src/clients/discord/client";
dotenv.config();

const DISCORD_COMMAND = [
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

const client = new DiscordApiClient();
client.installGlobalCommands(DISCORD_COMMAND);
