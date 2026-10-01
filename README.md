# Ticket Assistant bot

Small always-on program that listens to Discord and forwards ticket messages to the dashboard.

1. In the Discord Developer Portal, name your application **Ticket Assistant** — Discord automatically
   gives the bot a role with that name in every server it joins.
2. Under **Bot**, enable the **Message Content Intent**.
3. Deploy this folder to Railway / Fly.io / any Node 18+ host with these environment variables:
   - `DISCORD_BOT_TOKEN` — the bot token
   - `DASHBOARD_URL` — your published dashboard URL
   - `BOT_API_SECRET` — the same value saved in the dashboard's secrets
4. `npm install && npm start`
