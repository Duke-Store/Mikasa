const { EmbedBuilder } = require("discord.js");

const guildAdmins = new Map();

const PAYMENT_METHODS = ["Crypto", "Ltc", "Btc", "Usdt", "Eth", "Sol", "Paypal", "Visa/Mastercard", "Robux", "Gift cards"];

const REVIEW_TEXTS = [
  "Amazing service, very professional team! Highly recommended.",
  "Fast delivery and great communication. Will order again.",
  "The quality exceeded my expectations. Thank you!",
  "Smooth transaction, friendly staff. 10/10 experience.",
  "Very reliable and trustworthy. Got exactly what I needed.",
  "Quick response times and excellent support throughout.",
  "Professional work, fair pricing. Happy customer here!",
  "They went above and beyond. Absolutely satisfied.",
  "Best server for Roblox dev services. Legit and fast.",
  "Clear communication and smooth process. A+ service.",
];

const EMBED_COLORS = [0xFFD700, 0xF5C542, 0x4CAF50, 0x2ECC71, 0xE6B800, 0x27AE60];

const MIN_INTERVAL_MS = 60 * 60 * 1000;
const MAX_INTERVAL_MS = 2 * 60 * 60 * 1000;

const FAKE_REVIEWS_ENABLED = process.env.ALLOW_FAKE_REVIEWS !== 'false';
if (FAKE_REVIEWS_ENABLED) {
  console.warn('[AutoRating] Fake "Verified Customer" reviews (demo data on real member names) are ENABLED. Set ALLOW_FAKE_REVIEWS=false in .env to disable them.');
}

const guildConfigs = new Map();

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomPastTimestamp() {
  const now = Date.now();
  const daysAgo = Math.floor(Math.random() * 30) + 1;
  const hoursOffset = Math.floor(Math.random() * 24);
  return new Date(now - (daysAgo * 86400000) - (hoursOffset * 3600000));
}

function generateOrderNumber() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateStarRating() {
  const rating = randomPick([5, 5, 5, 5, 4, 4, 4, 4, 4, 3]);
  return "⭐".repeat(rating) + "☆".repeat(5 - rating);
}

const PRICES = [10, 15, 20, 25, 30, 10, 15, 20, 25, 30, 10, 15, 20, 25, 30, 10, 15, 20, 25, 30, 100, 200, 350, 500];

function generatePrice() {
  return randomPick(PRICES).toString();
}

function getAdmins(guildId) {
  return guildAdmins.get(guildId) || [];
}

function addAdmin(guildId, userId, username) {
  if (!guildAdmins.has(guildId)) {
    guildAdmins.set(guildId, []);
  }
  const list = guildAdmins.get(guildId);
  if (list.some(a => a.id === userId)) return false;
  list.push({ id: userId, username });
  return true;
}

function removeAdmin(guildId, userId) {
  const list = guildAdmins.get(guildId);
  if (!list) return false;
  const idx = list.findIndex(a => a.id === userId);
  if (idx === -1) return false;
  list.splice(idx, 1);
  return true;
}

async function getRandomMember(guild) {
  try {
    const members = await guild.members.fetch({ limit: 100 });
    const humans = members.filter(m => !m.user.bot);
    if (humans.size === 0) return null;
    return randomPick(Array.from(humans.values()));
  } catch (err) {
    console.error(`[AutoRating] Failed to fetch members for guild ${guild.id}:`, err.message);
    return null;
  }
}

function buildRatingEmbed(member) {
  const admins = getAdmins(member.guild.id);
  const admin = admins.length > 0 ? randomPick(admins) : null;
  const color = randomPick(EMBED_COLORS);

  const embed = new EmbedBuilder()
    .setColor(color)
    .setAuthor({
      name: member.displayName,
      iconURL: member.user.displayAvatarURL({ dynamic: true, size: 64 }),
    })
    .setTitle(`Rating: ${generateStarRating()}`)
    .addFields(
      { name: "User", value: `<@${member.id}>`, inline: false }
    );

  if (FAKE_REVIEWS_ENABLED) {
    const orderNumber = generateOrderNumber();
    const serviceTime = Math.floor(randomPastTimestamp().getTime() / 1000);
    embed.addFields(
      { name: "Order Number", value: `\`/${orderNumber}\``, inline: true },
      { name: "Service Time", value: `<t:${serviceTime}:F>`, inline: true },
      { name: "Admin", value: admin ? `<@${admin.id}>` : "N/A", inline: true },
      { name: "Price", value: `$${generatePrice()}`, inline: true },
      { name: "Payment Method", value: randomPick(PAYMENT_METHODS), inline: true },
      { name: "Comment", value: randomPick(REVIEW_TEXTS), inline: false },
    )
      .setFooter({ text: "Verified Customer" });
  }

  embed.setTimestamp();
  return embed;
}

function getRandomInterval() {
  return MIN_INTERVAL_MS + Math.floor(Math.random() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS));
}

async function sendAutoRating(client, guildId) {
  const config = guildConfigs.get(guildId);
  if (!config) return;

  try {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      console.warn(`[AutoRating] Guild ${guildId} not in cache, skipping.`);
      return;
    }

    const channel = guild.channels.cache.get(config.channelId);
    if (!channel) {
      console.warn(`[AutoRating] Channel ${config.channelId} not found in guild ${guildId}, skipping.`);
      return;
    }

    const member = await getRandomMember(guild);
    if (!member) {
      console.warn(`[AutoRating] No suitable members found in guild ${guildId}, skipping.`);
      return;
    }

    const embed = buildRatingEmbed(member);
    await channel.send({ embeds: [embed] });

    console.log(`[AutoRating] Sent rating in #${channel.name} (${guild.name}) as ${member.displayName}`);
  } catch (err) {
    console.error(`[AutoRating] Error sending rating in guild ${guildId}:`, err.message);
  }

  scheduleNext(client, guildId);
}

function scheduleNext(client, guildId) {
  const config = guildConfigs.get(guildId);
  if (!config) return;

  if (config.timerId) clearTimeout(config.timerId);

  const interval = getRandomInterval();
  config.timerId = setTimeout(() => sendAutoRating(client, guildId), interval);

  const minutes = Math.round(interval / 60000);
  console.log(`[AutoRating] Next rating in guild ${guildId} scheduled in ${minutes} min`);
}

function setRatingChannel(client, guildId, channelId) {
  const existing = guildConfigs.get(guildId);
  if (existing?.timerId) clearTimeout(existing.timerId);

  guildConfigs.set(guildId, { channelId, timerId: null });
  scheduleNext(client, guildId);

  console.log(`[AutoRating] Channel set to ${channelId} for guild ${guildId}`);
}

function stopRating(guildId) {
  const config = guildConfigs.get(guildId);
  if (config?.timerId) clearTimeout(config.timerId);
  guildConfigs.delete(guildId);
  console.log(`[AutoRating] Stopped for guild ${guildId}`);
}

function getRatingStatus(guildId) {
  const config = guildConfigs.get(guildId);
  if (!config) return null;
  return { channelId: config.channelId };
}

module.exports = {
  setRatingChannel,
  stopRating,
  getRatingStatus,
  sendAutoRating,
  buildRatingEmbed,
  getRandomMember,
  addAdmin,
  removeAdmin,
  getAdmins,
};
