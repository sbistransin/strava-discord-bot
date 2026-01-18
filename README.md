# Strava Discord Bot

A serverless Discord bot that posts Strava activities to a Discord channel.

## Features

- Automatic posting of Strava activities to Discord
- Slash commands for easy account management
- OAuth2 authentication with Strava
- Webhook support for real-time activity updates
- Serverless architecture ready for Vercel deployment
- Redis/KV storage for user data and tokens

## Prerequisites

- Node.js (v18 or higher recommended)
- A Discord Bot account with application credentials
- A Strava API application
- Vercel KV (Redis) database or compatible Redis instance

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd strava-discord-bot
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:

Create a `.env` file in the root directory with the following variables:

```env
# Strava API
STRAVA_CLIENT_ID=your_strava_client_id
STRAVA_CLIENT_SECRET=your_strava_client_secret
STRAVA_VERIFY_TOKEN=your_verify_token
STRAVA_REDIRECT_URI=http://localhost:80/auth/callback

# Discord Bot
DISCORD_BOT_TOKEN=your_discord_bot_token
DISCORD_PUBLIC_KEY=your_discord_public_key
DISCORD_APPLICATION_ID=your_application_id
DISCORD_FITNESS_CHANNEL_ID=your_channel_id

# Application
WEB_APP_URL=http://localhost:80

# Vercel KV (Redis)
KV_REST_API_TOKEN=your_kv_token
KV_REST_API_URL=your_kv_url
KV_URL=your_redis_url
```

## Configuration

### Discord Bot Setup

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Navigate to the "Bot" section and create a bot
4. Copy the bot token and public key
5. Enable the required intents
6. Invite the bot to your server with the necessary permissions

### Strava API Setup

1. Go to [Strava API Settings](https://www.strava.com/settings/api)
2. Create a new application
3. Set the Authorization Callback Domain to your application URL
4. Copy the Client ID and Client Secret

### Register Discord Commands

After setting up your environment variables, register the slash commands:

```bash
npm run register-commands
```

This will register the following commands with Discord:
- `/connect-strava` - Connect your Strava account
- `/disconnect-strava` - Disconnect your Strava account
- `/strava-status` - Check your connection status

## Usage

### Available Commands

- **`/connect-strava`** - Generates an OAuth link to connect your Strava account. The link expires in 15 minutes.
- **`/disconnect-strava`** - Removes your Strava account connection and revokes access.
- **`/strava-status`** - Shows whether your Strava account is connected and displays your athlete name.

### Workflow

1. Use `/connect-strava` in Discord to get an authentication link
2. Follow the link to authorize the bot with your Strava account
3. Once connected, your activities will automatically be posted to the configured Discord channel
4. Use `/strava-status` to verify your connection
5. Use `/disconnect-strava` when you want to remove the connection

## Development

### Build the project

```bash
npm run build
```

### Watch mode (auto-compile TypeScript)

```bash
npm run watch
```

### Type checking

```bash
npm run check-types
```

### Run in development

```bash
npm run dev
```

This will start the Express server on port 80 (or the port specified in your environment).

## Project Structure

```
strava-discord-bot/
├── src/
│   ├── clients/           # API clients
│   │   ├── discord/       # Discord API client
│   │   └── strava/        # Strava API client
│   ├── services/          # Business logic
│   │   ├── auth/          # OAuth flow handlers
│   │   └── discord/       # Discord interaction handlers
│   ├── storage/           # Data types and storage
│   ├── webhooks/          # Strava webhook handlers
│   └── index.ts           # Application entry point
├── dist/                  # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
└── README.md
```

## API Endpoints

- `POST /interactions` - Discord interactions endpoint (slash commands)
- `GET /auth/start/:discordUserId` - Initiate Strava OAuth flow
- `GET /auth/callback` - Strava OAuth callback
- `POST /webhook` - Strava webhook events
- `GET /` - Health check endpoint

## Deployment

This bot is designed to be deployed on Vercel:

1. Install Vercel CLI: `npm i -g vercel`
2. Set up Vercel KV (Redis) in your project
3. Configure environment variables in Vercel dashboard
4. Deploy: `vercel --prod`

Make sure to update your `STRAVA_REDIRECT_URI` and `WEB_APP_URL` to match your production domain.

## License

This project is available for personal and educational use.
