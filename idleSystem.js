const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
const ticketConfig = require('./ticket-config.json');
const { applyTicketPermissionOverwrites } = require('./utils');

const WARNING_TIMEOUT = 12 * 60 * 60 * 1000;
const CLOSE_TIMEOUT = 12 * 60 * 60 * 1000;
const CHECK_INTERVAL = 60 * 1000;

const tracker = new Map();

function getTicketNumber(channelName) {
  const match = channelName.match(/🎫・(\d+)/);
  return match ? match[1] : null;
}

function getOriginalOwner(channel) {
  const staffRoleID = ticketConfig.STAFF_ROLE_ID;
  const managerRoleID = ticketConfig.MANAGER_ROLE_ID;
  return channel.permissionOverwrites.cache.find(p => {
    if (!p) return false;
    if (p.id === channel.guild.id) return false;
    if (p.id === staffRoleID) return false;
    if (p.id === managerRoleID) return false;
    if (channel.guild.roles.cache.has(p.id)) return false;
    return true;
  });
}

async function closeTicket(channel) {
  try {
    const staffRoleID = ticketConfig.STAFF_ROLE_ID;
    const managerRoleID = ticketConfig.MANAGER_ROLE_ID;
    const originalOwner = getOriginalOwner(channel);
    const ticketNumber = getTicketNumber(channel.name);

    await applyTicketPermissionOverwrites(channel, {
      staffRoleId: staffRoleID,
      managerRoleId: managerRoleID,
      ownerId: originalOwner ? originalOwner.id : null,
      openOwner: false,
    });

    await channel.setName(`idle-${ticketNumber || '0'}`).catch(() => {});

    const closedContainer = new ContainerBuilder()
      .setAccentColor(0xFFDD00)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('# 🔒 Ticket Closed Due to Inactivity\n\nThis ticket has been automatically closed due to 24 hours of inactivity.')
      );

    await channel.send({ components: [closedContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
    tracker.delete(channel.id);
  } catch (err) {
    console.error(`Failed to auto-close idle ticket ${channel.name}:`, err);
  }
}

async function sendWarning(channel) {
  try {
    const originalOwner = getOriginalOwner(channel);
    const ownerId = originalOwner ? originalOwner.id : 'Unknown';
    const staffRoleID = ticketConfig.STAFF_ROLE_ID;

    const warningContainer = new ContainerBuilder()
      .setAccentColor(0xFFDD00)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# ⏰ Inactivity Warning\n\n<@${ownerId}> <@&${staffRoleID}>\n\nThis ticket has been **inactive for 12 hours**. If no message is sent within the next **12 hours**, this ticket will be automatically closed.`)
      );

    await channel.send({ components: [warningContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
  } catch (err) {
    console.error(`Failed to send idle warning for ${channel.name}:`, err);
  }
}

function initIdleSystem(client) {
  setInterval(async () => {
    const now = Date.now();
    const staffRoleID = ticketConfig.STAFF_ROLE_ID;
    const managerRoleID = ticketConfig.MANAGER_ROLE_ID;

    for (const [channelId, data] of tracker) {
      if (data.closed) continue;

      const channel = client.channels.cache.get(channelId);
      if (!channel) {
        tracker.delete(channelId);
        continue;
      }

      const elapsed = now - data.lastMessage;

      if (data.warningSent) {
        if (elapsed >= CLOSE_TIMEOUT) {
          await closeTicket(channel);
          data.closed = true;
        }
      } else {
        if (elapsed >= WARNING_TIMEOUT) {
          await sendWarning(channel);
          data.warningSent = true;
          data.lastMessage = now;
        }
      }
    }
  }, CHECK_INTERVAL);
}

function resetIdleTimer(channelId) {
  const data = tracker.get(channelId);
  if (data && !data.warningSent && !data.closed) {
    data.lastMessage = Date.now();
  }
}

function trackTicket(channelId, ownerId) {
  if (!tracker.has(channelId)) {
    tracker.set(channelId, {
      lastMessage: Date.now(),
      warningSent: false,
      closed: false,
      ownerId: ownerId || null,
      ratingRequested: false,
    });
  }
}

function untrackTicket(channelId) {
  tracker.delete(channelId);
}

function isTracked(channelId) {
  return tracker.has(channelId);
}

function hasOpenTicket(userId) {
  for (const [channelId, data] of tracker) {
    if (data.ownerId === userId && !data.closed) return channelId;
  }
  return null;
}

function hasRatingBeenRequested(channelId) {
  const data = tracker.get(channelId);
  return data ? data.ratingRequested === true : false;
}

function markRatingRequested(channelId) {
  const data = tracker.get(channelId);
  if (data) data.ratingRequested = true;
}

module.exports = { initIdleSystem, resetIdleTimer, trackTicket, untrackTicket, isTracked, hasOpenTicket, hasRatingBeenRequested, markRatingRequested };
