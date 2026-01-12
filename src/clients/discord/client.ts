import { URLSearchParams } from "node:url";
import { DiscordApiError } from "./error";
import {
  DiscordRequestError,
  DiscordApiResponse,
  DiscordCommand,
  DiscordMessage,
} from "./types";

// todo: better logging if tokens are not present

export class DiscordApiClient {
  /* Base URL for Discord API. */
  private baseUrl = "https://discord.com";

  /* API version. */
  private version = "v10" as const;

  /**
   * Make a call to the Discord API.
   * @param opts.uri Uri of the Discord API endpoint i.e. `/channels`
   * @param opts.method HTTP method
   * @param opts.body Request body
   * @param opts.headers Request headers
   */
  private async makeCall<T>(opts: {
    uri: string;
    method: "GET" | "POST";
    body?: BodyInit | null | undefined;
    headers?: HeadersInit;
  }): Promise<T> {
    try {
      const url = new URL(`/api/${this.version}${opts.uri}`, this.baseUrl);

      const response = await fetch(url, {
        method: opts.method,
        headers: {
          Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
          "User-Agent":
            "DiscordBot (https://github.com/sbistransin/strava-discord-bot, 1.0.0)",
          "Content-Type": "application/json",
          ...opts?.headers,
        },
        ...(opts?.body && { body: opts.body }),
      });

      const responseBody: DiscordApiResponse = await response.json();

      if (!response.ok) {
        const errorResponse = responseBody as DiscordRequestError;
        throw new DiscordApiError(
          errorResponse.message || "Unknown Discord API error",
          errorResponse.code || 0,
          response.status
        );
      }

      return responseBody as T;
    } catch (error) {
      if (error instanceof DiscordApiError) {
        throw error;
      }

      // Wrap unexpected errors (network failures, JSON parse errors, etc.)
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Discord API call failed: ${errorMessage}`);
    }
  }

  /**
   * Calls Discord API to install global commands
   * https://discord.com/developers/docs/interactions/application-commands#bulk-overwrite-global-application-commands
   *
   * @param {*} commands List of commands to install
   */
  public async installGlobalCommands(commands: DiscordCommand[]) {
    const res = await this.makeCall<DiscordCommand[]>({
      uri: "/applications/" + process.env.DISCORD_APPLICATION_ID + "/commands",
      method: "POST",
      body: JSON.stringify(commands),
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
      },
    });

    console.log("✅ Successfully registered commands:", res);
    // res.Commands.forEach((cmd) => console.log(`  - /${cmd.name}`));
  }

  /**
   * Send a message to a Discord channel
   * @param channelId
   * @param messageContent
   */
  public async sendMessage(channelId: string, messageContent: string) {
    await this.makeCall<DiscordMessage>({
      uri: `/channels/${channelId}/messages`,
      method: "POST",
      body: JSON.stringify({ content: messageContent }),
    });

    console.log(`Sent activity notification to ${channelId}`);
  }
}
