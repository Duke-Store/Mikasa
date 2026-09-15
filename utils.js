const fs = require('fs');
const path = require('path');
const { PermissionFlagsBits } = require('discord.js');

const writeQueues = new Map();

function writeFileAsync(filePath, data) {
  const prev = writeQueues.get(filePath) || Promise.resolve();
  const next = prev
    .catch(() => {})
    .then(() => new Promise((resolve, reject) => {
      const tmpPath = `${filePath}.tmp`;
      fs.writeFile(tmpPath, data, 'utf8', (err) => {
        if (err) {
          console.error(`Async write failed for ${path.basename(filePath)}:`, err.message);
          reject(err);
          return;
        }
        fs.rename(tmpPath, filePath, (renameErr) => {
          if (renameErr) {
            console.error(`Async rename failed for ${path.basename(filePath)}:`, renameErr.message);
            reject(renameErr);
            return;
          }
          resolve();
        });
      });
    }));
  writeQueues.set(filePath, next.catch(() => {}));
  return next;
}

function flushFileWrites() {
  return Promise.all(Array.from(writeQueues.values())).catch(() => {});
}

const SETTINGS_FILE = path.join(__dirname, 'guildSettings.json');
const STATS_FILE = path.join(__dirname, 'userStats.json');

// Guild settings
const guildSettings = new Map();
const defaultGuildSettings = {
  prefix: '!',
  logEnabled: true,
  logChannelId: null,
  welcomeChannelId: null,
  welcomeMessage: null,
  goodbyeChannelId: null,
  goodbyeMessage: null,
  autoRoleId: null,
  modRoleId: null,
  muteRoleId: null,
};

function applyDefaultGuildSettings(partial) {
  return { ...defaultGuildSettings, ...(partial || {}) };
}

function loadGuildSettingsFromFile() {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) return;
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf8');
    if (!raw) return;
    const parsed = JSON.parse(raw);
    for (const [guildId, settings] of Object.entries(parsed)) {
      guildSettings.set(guildId, applyDefaultGuildSettings(settings));
    }
    console.log(`Loaded settings for ${guildSettings.size} guild(s).`);
  } catch (err) {
    console.error('Failed to load guild settings:', err);
  }
}

function saveGuildSettingsToFile() {
  try {
    const obj = {};
    for (const [guildId, settings] of guildSettings.entries()) {
      obj[guildId] = settings;
    }
    return writeFileAsync(SETTINGS_FILE, JSON.stringify(obj, null, 2));
  } catch (err) {
    console.error('Failed to save guild settings:', err);
    return Promise.resolve();
  }
}

function getGuildSettings(guildId) {
  let s = guildSettings.get(guildId);
  if (!s) {
    s = applyDefaultGuildSettings();
    guildSettings.set(guildId, s);
    saveGuildSettingsToFile();
  }
  return s;
}

// User stats
const userStats = new Map();
const voiceSessions = new Map();
let statsDirty = false;

function loadUserStatsFromFile() {
  try {
    if (!fs.existsSync(STATS_FILE)) return;
    const raw = fs.readFileSync(STATS_FILE, 'utf8');
    if (!raw) return;
    const parsed = JSON.parse(raw);
    for (const [guildId, users] of Object.entries(parsed)) {
      const m = new Map();
      for (const [userId, data] of Object.entries(users)) {
        m.set(userId, {
          messages: data.messages || 0,
          voiceMs: data.voiceMs || 0,
        });
      }
      userStats.set(guildId, m);
    }
    console.log(`Loaded user stats for ${userStats.size} guild(s).`);
  } catch (err) {
    console.error('Failed to load user stats:', err);
  }
}

function saveUserStatsToFile() {
  try {
    const obj = {};
    for (const [guildId, m] of userStats.entries()) {
      obj[guildId] = {};
      for (const [userId, data] of m.entries()) {
        obj[guildId][userId] = data;
      }
    }
    return writeFileAsync(STATS_FILE, JSON.stringify(obj, null, 2));
  } catch (err) {
    console.error('Failed to save user stats:', err);
    return Promise.resolve();
  }
}

function getUserStats(guildId, userId) {
  let g = userStats.get(guildId);
  if (!g) {
    g = new Map();
    userStats.set(guildId, g);
  }
  let data = g.get(userId);
  if (!data) {
    data = { messages: 0, voiceMs: 0 };
    g.set(userId, data);
  }
  return data;
}

// Helper functions
function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const parts = [];
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (s || parts.length === 0) parts.push(`${s}s`);
  return parts.join(' ');
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  seconds %= 86400;
  const h = Math.floor(seconds / 3600);
  seconds %= 3600;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (s || parts.length === 0) parts.push(`${s}s`);
  return parts.join(' ');
}

function parseDuration(str) {
  if (!str) return null;
  const match = str
    .trim()
    .match(/^(\d+)\s*(s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hour|hours|d|day|days)$/i);
  if (!match) return null;
  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const map = {
    s: 1000, sec: 1000, secs: 1000, second: 1000, seconds: 1000,
    m: 60000, min: 60000, mins: 60000, minute: 60000, minutes: 60000,
    h: 3600000, hr: 3600000, hour: 3600000, hours: 3600000,
    d: 86400000, day: 86400000, days: 86400000,
  };
  return value * map[unit];
}

async function safeRespond(interaction, opts = {}) {
  try {
    const replyOpts = { ...opts };
    if (interaction.replied || interaction.deferred) {
      if ('fetchReply' in replyOpts) delete replyOpts.fetchReply;
      return interaction.editReply(replyOpts).catch((e) => {
        console.error('safeRespond.editReply failed:', e);
      });
    }
    return interaction.reply(replyOpts).catch((e) => {
      console.error('safeRespond.reply failed:', e);
    });
  } catch (err) {
    console.error('safeRespond error:', err);
  }
}

async function logToGuild(guild, message) {
  const settings = getGuildSettings(guild.id);
  if (!settings.logChannelId) return;
  if (settings.logEnabled === false) return;
  const channel = guild.channels.cache.get(settings.logChannelId);
  if (!channel || !channel.isTextBased) return;
  try {
    await channel.send(message);
  } catch (e) {
    console.error('Failed to send log message:', e);
  }
}

const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');

async function logModerationAction(guild, action, admin, targetUser, reason) {
  const { proDbGet } = require('./db');
  const channelId = await proDbGet(`Moderation_${guild.id}`);
  if (!channelId) return;
  const channel = guild.channels.cache.get(channelId);
  if (!channel || !channel.isTextBased) return;

  const container = new ContainerBuilder()
    .setAccentColor(0xFFDD00)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# Log (${action})\n\n**Admin:** ${admin}\n**User:** ${targetUser}\n**Reason:** ${reason}`),
      new TextDisplayBuilder().setContent(`*<t:${Math.floor(Date.now() / 1000)}:F>*`)
    );

  try {
    await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
  } catch (e) {
    console.error(`Failed to send moderation log for ${action}:`, e);
  }
}

const ADMIN_IDS = new Set(
  (process.env.ADMIN_IDS || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
);

function isAdmin(userId) {
  return ADMIN_IDS.has(userId);
}

const ticketConfig = require('./ticket-config.json');

function getStaffRoleIds() {
  const ids = [];
  if (ticketConfig.STAFF_ROLE_ID) ids.push(ticketConfig.STAFF_ROLE_ID);
  if (ticketConfig.MANAGER_ROLE_ID) ids.push(ticketConfig.MANAGER_ROLE_ID);
  return ids;
}

function isStaffMember(member) {
  if (!member) return false;
  const ids = getStaffRoleIds();
  for (const id of ids) {
    if (member.roles.cache.has(id)) return true;
  }
  try {
    if (member.permissions && member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  } catch (e) {}
  return false;
}

async function applyTicketPermissionOverwrites(channel, { staffRoleId, managerRoleId, ownerId, openOwner = true } = {}) {
  if (!channel || !channel.permissionOverwrites) return;
  const ops = [];
  if (channel.guild) {
    ops.push(channel.permissionOverwrites.edit(channel.guild.id, { ViewChannel: false }).catch(() => {}));
  }
  if (staffRoleId) {
    ops.push(channel.permissionOverwrites.edit(staffRoleId, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true }).catch(() => {}));
  }
  if (managerRoleId && managerRoleId !== staffRoleId) {
    ops.push(channel.permissionOverwrites.edit(managerRoleId, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true }).catch(() => {}));
  }
  if (ownerId) {
    ops.push(channel.permissionOverwrites.edit(ownerId, openOwner ? { ViewChannel: true, SendMessages: true, ReadMessageHistory: true } : { ViewChannel: false }).catch(() => {}));
  }
  await Promise.all(ops);
}

const cooldowns = new Map();

function getRemainingCooldown(userId, key) {
  const mapKey = `${userId}:${key}`;
  const expiry = cooldowns.get(mapKey);
  if (expiry && Date.now() < expiry) return Math.ceil((expiry - Date.now()) / 1000);
  return 0;
}

function setCooldown(userId, key, durationMs) {
  const mapKey = `${userId}:${key}`;
  cooldowns.set(mapKey, Date.now() + durationMs);
}

const cooldownSweep = setInterval(() => {
  const now = Date.now();
  for (const [mapKey, expiry] of cooldowns) {
    if (expiry <= now) cooldowns.delete(mapKey);
  }
}, 30000);
cooldownSweep.unref();

module.exports = {
  // Settings
  guildSettings,
  getGuildSettings,
  saveGuildSettingsToFile,
  loadGuildSettingsFromFile,
  defaultGuildSettings,
  
  // Stats
  userStats,
  voiceSessions,
  statsDirty,
  getUserStats,
  saveUserStatsToFile,
  loadUserStatsFromFile,
  
  // Helpers
  formatDuration,
  formatUptime,
  parseDuration,
  safeRespond,
  logToGuild,
  logModerationAction,
  isAdmin,
  isStaffMember,
  applyTicketPermissionOverwrites,
  ADMIN_IDS,
  getRemainingCooldown,
  setCooldown,
  
  // File I/O
  writeFileAsync,
  flushFileWrites,
};
