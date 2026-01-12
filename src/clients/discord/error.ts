// errors/DiscordApiError.ts
export class DiscordApiError extends Error {
  constructor(message: string, public code: number, public statusCode: number) {
    super(message);
    this.name = "DiscordApiError";
  }
}
