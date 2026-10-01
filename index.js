// Ticket Assistant — Discord listener.
// Run this on an always-on host (Railway, Fly.io, a VPS). It forwards ticket
// messages to the dashboard, which decides whether to answer or escalate.
import { Client, GatewayIntentBits, Partials, ChannelType } from "discord.js";

const { DISCORD_BOT_TOKEN, DASHBOARD_URL, BOT_API_SECRET } = process.env;
if (!DISCORD_BOT_TOKEN || !DASHBOARD_URL || !BOT_API_SECRET) {
  console.error("Set DISCORD_BOT_TOKEN, DASHBOARD_URL and BOT_API_SECRET");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
  client.user.setActivity("your tickets", { type: 3 });
});

const busy = new Set();

client.on("messageCreate", async (msg) => {
  if (!msg.guild || msg.author.bot || !msg.content?.trim()) return;
  const ch = msg.channel;
  const isThread = ch.isThread();
  const parent = isThread ? ch.parent : null;
  const categoryId = isThread ? parent?.parentId ?? null : ch.parentId ?? null;
  if (ch.type !== ChannelType.GuildText && !isThread) return;
  if (busy.has(ch.id)) return;
  busy.add(ch.id);

  try {
    const recent = await ch.messages.fetch({ limit: 15, before: msg.id }).catch(() => null);
    const history = recent
      ? [...recent.values()].reverse().filter((m) => m.content).map((m) => ({
          author: m.author.id === client.user.id ? "Ticket Assistant" : m.member?.displayName ?? m.author.username,
          content: m.content.slice(0, 4000),
        }))
      : [];

    const res = await fetch(`${DASHBOARD_URL.replace(/\/$/, "")}/api/public/bot/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${BOT_API_SECRET}` },
      body: JSON.stringify({
        guild_id: msg.guild.id,
        guild_name: msg.guild.name,
        channel_id: ch.id,
        channel_name: ch.name,
        category_id: categoryId,
        parent_channel_name: parent?.name ?? null,
        is_thread: isThread,
        author_name: msg.member?.displayName ?? msg.author.username,
        author_role_ids: msg.member ? [...msg.member.roles.cache.keys()] : [],
        content: msg.content.slice(0, 4000),
        history,
      }),
    });
    if (!res.ok) {
      console.error("Dashboard error", res.status, await res.text());
      return;
    }
    const out = await res.json();
    if (out.action === "none") return;
    await ch.sendTyping().catch(() => {});
    await msg.reply({
      content: out.content.slice(0, 2000),
      allowedMentions: out.role_id ? { roles: [out.role_id], repliedUser: false } : { parse: [], repliedUser: false },
    });
  } catch (e) {
    console.error(e);
  } finally {
    busy.delete(ch.id);
  }
});

client.login(DISCORD_BOT_TOKEN);
