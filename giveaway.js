const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { writeFileAsync } = require('./utils');

let giveaways = [];

const GIVEAWAYS_FILE = path.join(__dirname, 'giveaways.json');

function loadGiveawaysFromFile() {
  try {
    if (fs.existsSync(GIVEAWAYS_FILE)) {
      const data = fs.readFileSync(GIVEAWAYS_FILE, 'utf8');
      giveaways = JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading giveaways:', error);
  }
}

function saveGiveawaysToFile() {
  try {
    return writeFileAsync(GIVEAWAYS_FILE, JSON.stringify(giveaways, null, 2));
  } catch (error) {
    console.error('Error saving giveaways:', error);
    return Promise.resolve();
  }
}

function loadGiveaways(client) {
  loadGiveawaysFromFile();
  // Schedule end checks
  setInterval(() => {
    checkEndedGiveaways(client);
  }, 10000); // Check every 10 seconds
}

function getGiveaway(messageId) {
  return giveaways.find(g => g.messageId === messageId);
}

function addParticipant(messageId, userId) {
  const giveaway = getGiveaway(messageId);
  if (giveaway && !giveaway.participants.includes(userId) && !giveaway.paused) {
    giveaway.participants.push(userId);
    saveGiveawaysToFile();
  }
}

function createGiveaway(guildId, channelId, hostId, prize, duration) {
  const endTime = Date.now() + duration;
  const giveaway = {
    guildId,
    channelId,
    hostId,
    prize,
    endTime,
    paused: false,
    participants: [],
    messageId: null // Will be set after sending message
  };
  giveaways.push(giveaway);
  saveGiveawaysToFile();
  return giveaway;
}

function setMessageId(messageId, giveaway) {
  giveaway.messageId = messageId;
  saveGiveawaysToFile();
}

function pauseGiveaway(messageId) {
  const giveaway = getGiveaway(messageId);
  if (giveaway && !giveaway.paused) {
    giveaway.paused = true;
    giveaway.pausedAt = Date.now();
    saveGiveawaysToFile();
    return true;
  }
  return false;
}

function resumeGiveaway(messageId) {
  const giveaway = getGiveaway(messageId);
  if (giveaway && giveaway.paused) {
    giveaway.paused = false;
    const pausedDuration = Date.now() - giveaway.pausedAt;
    giveaway.endTime += pausedDuration;
    delete giveaway.pausedAt;
    saveGiveawaysToFile();
    return true;
  }
  return false;
}

function endGiveaway(messageId) {
  const giveaway = getGiveaway(messageId);
  if (giveaway) {
    giveaway.endTime = Date.now();
    saveGiveawaysToFile();
    return giveaway;
  }
  return null;
}

function rerollGiveaway(messageId) {
  const giveaway = getGiveaway(messageId);
  if (giveaway && giveaway.participants.length > 0) {
    const winner = giveaway.participants[Math.floor(Math.random() * giveaway.participants.length)];
    return winner;
  }
  return null;
}

function editGiveaway(messageId, newPrize, newDuration) {
  const giveaway = getGiveaway(messageId);
  if (giveaway) {
    if (newPrize) giveaway.prize = newPrize;
    if (newDuration) giveaway.endTime = Date.now() + newDuration;
    saveGiveawaysToFile();
    return true;
  }
  return false;
}

function getActiveGiveaways(guildId) {
  return giveaways.filter(g => g.guildId === guildId && g.endTime > Date.now());
}

function checkEndedGiveaways(client) {
  const now = Date.now();
  giveaways.forEach(async (giveaway) => {
    if (giveaway.endTime <= now && !giveaway.paused && giveaway.messageId) {
      const guild = client.guilds.cache.get(giveaway.guildId);
      if (!guild) return;
      const channel = guild.channels.cache.get(giveaway.channelId);
      if (!channel) return;
      try {
        const message = await channel.messages.fetch(giveaway.messageId);
        if (giveaway.participants.length === 0) {
          const endedContainer = new ContainerBuilder().setAccentColor(0xFFDD00).addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# 🎉 GIVEAWAY ENDED\n\n**Prize:** ${giveaway.prize}\n**Winner:** No one entered the giveaway.`)
          );
          await message.edit({ components: [endedContainer], flags: MessageFlags.IsComponentsV2 });
        } else {
          const winnerId = giveaway.participants[Math.floor(Math.random() * giveaway.participants.length)];
          const winner = await client.users.fetch(winnerId);
          const endedContainer = new ContainerBuilder().setAccentColor(0xFFDD00).addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# 🎉 GIVEAWAY ENDED\n\n**Prize:** ${giveaway.prize}\n**Winner:** ${winner.tag} (${winnerId})`)
          );
          await message.edit({ components: [endedContainer], flags: MessageFlags.IsComponentsV2 });
          const congratsContainer = new ContainerBuilder().setAccentColor(0xFFDD00).addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# 🎉 Congratulations!\n\nCongratulations ${winner}! You won **${giveaway.prize}**!`)
          );
          await channel.send({ components: [congratsContainer], flags: MessageFlags.IsComponentsV2 });
        }
        // Remove from list
        giveaways = giveaways.filter(g => g.messageId !== giveaway.messageId);
        saveGiveawaysToFile();
      } catch (error) {
        console.error('Error ending giveaway:', error);
        // Message/channel is gone or unreachable; stop retrying this giveaway.
        giveaways = giveaways.filter(g => g.messageId !== giveaway.messageId);
        saveGiveawaysToFile();
      }
    }
  });
}

module.exports = {
  loadGiveaways,
  getGiveaway,
  addParticipant,
  createGiveaway,
  setMessageId,
  pauseGiveaway,
  resumeGiveaway,
  endGiveaway,
  rerollGiveaway,
  editGiveaway,
  getActiveGiveaways
};