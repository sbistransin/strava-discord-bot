export type DiscordCommand = {
  name: string;
  description: string;
};

type DiscordError = unknown;

export type DiscordRequestError = {
  code: number;
  message: string;
  errors?: DiscordError[];
};

export type DiscordApiSuccess = {
  name: string;
};

export type DiscordApiResponse = DiscordRequestError | DiscordApiSuccess;

export type DiscordMessage = {
  id: string;
  channel_id: string;
  content: string;
};
