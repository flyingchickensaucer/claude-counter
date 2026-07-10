# claude-counter

A Slack bot that keeps a public record of who says "claude" the most. Every mention is tallied and acknowledged. Milestones are proclaimed. The #1 spot holds the title of Chief Claude Officer.

Built for the [Stardance slack-bot mission](https://stardance.hackclub.com/missions/slack-bot/guide).

## What it does

1. **Auto-reply on every mention** — say "claude" anywhere the bot lives and it replies in-thread with your running invocation count. Crossing a milestone (10, 25, 50, 100, 250, 500, 1000) earns a proclamation
2. **`/claude-counter-board`** — posts the Vibe Coding Hall of Slop, the top 10 ranked by mentions (also triggered by saying "claudeboard")
3. **`/claude-counter-me`** — your own count and rank, shown only to you
4. **`/claude-counter-sermon`** — a randomly chosen vibe coding proverb

All slash commands are prefixed with the bot name so they don't collide with other bots in the Hack Club workspace.

## Setup

1. Create a Slack app at https://api.slack.com/apps in the Hack Club workspace, choose **From a manifest**, and paste in [manifest.yml](manifest.yml). This registers the scopes, events, and all three slash commands in one go
2. Under **Basic Information → App-Level Tokens**, create a token with the `connections:write` scope. That's your `SLACK_APP_TOKEN`
3. Install the app to the workspace. The bot token under **OAuth & Permissions** is your `SLACK_BOT_TOKEN`
4. Locally:

```sh
cp .env.example .env   # fill in both tokens
npm install
npm start
```

5. Invite the bot to a channel with `/invite @claude-counter` and start saying claude

Test in **#bot-spam** or your own channel, not in #stardance.

## Deploying 24/7 on Nest

The bot uses socket mode, so it needs no public URL, just a machine that stays on. Per the guide, that's [Hack Club Nest](https://hackclub.app/):

1. Push this repo to GitHub, then on Nest:

```sh
git clone <your-repo-url> ~/claude-counter
cd ~/claude-counter
npm install
nano .env   # recreate it by hand, it's gitignored
```

2. Create a user systemd service at `~/.config/systemd/user/claude-counter.service`:

```ini
[Unit]
Description=claude-counter slack bot
After=network.target

[Service]
WorkingDirectory=%h/claude-counter
ExecStart=/usr/bin/node app.js
Restart=always

[Install]
WantedBy=default.target
```

3. Enable it so it survives reboots and logouts:

```sh
systemctl --user daemon-reload
systemctl --user enable --now claude-counter
systemctl --user status claude-counter   # should say active (running)
```

## Notes

- Counts are stored in `counts.json` next to the app, so they survive restarts. On Nest the disk is persistent, so this is fine
- The word boundary regex means "claudeboard" itself doesn't score a point, so checking the leaderboard is free
