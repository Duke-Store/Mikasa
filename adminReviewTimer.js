const fs = require('fs');
const path = require('path');
const { writeFileAsync } = require('./utils');

const REVIEW_FILE = path.join(__dirname, 'adminReviewQueue.json');

let reviewQueue = new Map();

function loadReviewQueue() {
  try {
    if (!fs.existsSync(REVIEW_FILE)) return;
    const raw = fs.readFileSync(REVIEW_FILE, 'utf8').trim();
    if (!raw) return;
    const parsed = JSON.parse(raw);
    for (const [id, data] of Object.entries(parsed)) {
      reviewQueue.set(id, data);
    }
  } catch (err) {
    console.error('Failed to load review queue:', err.message);
  }
}

function saveReviewQueue() {
  try {
    const obj = {};
    for (const [id, data] of reviewQueue.entries()) {
      obj[id] = data;
    }
    return writeFileAsync(REVIEW_FILE, JSON.stringify(obj, null, 2));
  } catch (err) {
    console.error('Failed to save review queue:', err.message);
    return Promise.resolve();
  }
}

function addToQueue(requestId, type, userId, userTag, ticketNumber, guildId) {
  const now = Date.now();
  const entry = {
    requestId,
    type, // 'seller' or 'buyer'
    userId,
    userTag,
    ticketNumber,
    guildId,
    submittedAt: now,
    expiresAt: now + 24 * 60 * 60 * 1000, // 24 hours
    status: 'pending', // pending, accepted, declined
    adminResponse: null,
    adminId: null,
  };
  reviewQueue.set(requestId, entry);
  saveReviewQueue();
  return entry;
}

function getPendingReviews() {
  const now = Date.now();
  const pending = [];
  for (const [id, entry] of reviewQueue.entries()) {
    if (entry.status === 'pending' && entry.expiresAt > now) {
      pending.push(entry);
    }
  }
  return pending;
}

function getExpiredReviews() {
  const now = Date.now();
  const expired = [];
  for (const [id, entry] of reviewQueue.entries()) {
    if (entry.status === 'pending' && entry.expiresAt <= now) {
      expired.push(entry);
    }
  }
  return expired;
}

function acceptReview(requestId, adminId, decision, reason) {
  const entry = reviewQueue.get(requestId);
  if (!entry) return false;
  entry.status = decision; // 'accepted' or 'declined'
  entry.adminResponse = reason || '';
  entry.adminId = adminId;
  entry.resolvedAt = Date.now();
  saveReviewQueue();
  return true;
}

function getReview(requestId) {
  return reviewQueue.get(requestId) || null;
}

function removeReview(requestId) {
  reviewQueue.delete(requestId);
  saveReviewQueue();
}

let timerInterval = null;

function startTimerCheck(client) {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(async () => {
    const expired = getExpiredReviews();
    for (const entry of expired) {
      await escalateReview(client, entry);
    }
  }, 60 * 1000); // Check every 60 seconds
  console.log('[AdminReviewTimer] Timer check started (every 60s)');
}

async function escalateReview(client, entry) {
  try {
    const config = require('./config');
    const adminRoleId = config.ROLES?.ADMIN;
    const reviewChannelId = config.CHANNELS?.PROJECTS;

    if (adminRoleId && reviewChannelId) {
      const guild = client.guilds.cache.get(entry.guildId);
      if (guild) {
        const channel = guild.channels.cache.get(reviewChannelId);
        if (channel) {
          const container = require('discord.js').ContainerBuilder;
          const TextDisplayBuilder = require('discord.js').TextDisplayBuilder;
          const SeparatorBuilder = require('discord.js').SeparatorBuilder;
          const SeparatorSpacingSize = require('discord.js').SeparatorSpacingSize;
          const MessageFlags = require('discord.js').MessageFlags;

          const embed = new container()
            .setAccentColor(0xFF0000)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`# ⚠️ URGENT: Review Expired\\n\\n**Review ID:** ${entry.requestId}\\n**Type:** ${entry.type}\\n**User:** ${entry.userTag} (${entry.userId})\\n**Submitted:** <t:${Math.floor(entry.submittedAt / 1000)}:F>\\n**Expires:** <t:${Math.floor(entry.expiresAt / 1000)}:F>\\n\\nThis review has been pending for over 24 hours. Please handle immediately.`)
            )
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`*<@&${adminRoleId}> — Action required*`)
            );

          await channel.send({ components: [embed], flags: MessageFlags.IsComponentsV2 }).catch(err => console.error('Failed to send escalation:', err));
        }
      }
    }
    console.log(`[AdminReviewTimer] Escalated expired review: ${entry.requestId}`);
  } catch (err) {
    console.error('[AdminReviewTimer] Escalation error:', err.message);
  }
}

function stopTimerCheck() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

loadReviewQueue();

module.exports = {
  addToQueue,
  getPendingReviews,
  getExpiredReviews,
  acceptReview,
  getReview,
  removeReview,
  startTimerCheck,
  stopTimerCheck,
  loadReviewQueue,
  saveReviewQueue,
};
