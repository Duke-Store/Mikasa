const fs = require('fs');
const path = require('path');
const { CHANNELS } = require('./config');
const { writeFileAsync } = require('./utils');

const SAVE_DIR = path.join(__dirname, 'saved-applications');

function ensureDir() {
  if (!fs.existsSync(SAVE_DIR)) fs.mkdirSync(SAVE_DIR, { recursive: true });
}

function buildMarkdown(answers, developerTag = '', clientTag = '') {
  const lines = answers.map(
    (q, i) => `**Question ${String(i + 1).padStart(2, '0')}:** ${q.answer}`
  );
  if (developerTag) lines.push(`**Developer:** ${developerTag}`);
  if (clientTag) lines.push(`**Project Owner:** ${clientTag}`);
  return lines.join('\n');
}

async function saveAndSend(client, { guildId, answers, type, userTag, ticketNumber }) {
  try {
    ensureDir();

    const safeTag = userTag.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${ticketNumber || Date.now()}-${safeTag}-${type}.md`;
    const filePath = path.join(SAVE_DIR, fileName);

    const developerTag = type === 'developer' ? userTag : '';
    const clientTag = type === 'client' ? userTag : '';
    const content = buildMarkdown(answers, developerTag, clientTag);

    await writeFileAsync(filePath, content);

    const channelId = type === 'developer'
      ? CHANNELS.DEVELOPER_APPLICATIONS
      : CHANNELS.CLIENT_SUBMISSIONS;

    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      console.error(`Guild ${guildId} not found`);
      return null;
    }

    const channel = guild.channels.cache.get(channelId);
    if (!channel) {
      console.error(`Channel ${channelId} not found in guild`);
      return null;
    }

    await channel.send({
      content: `📄 **New ${type} submission from ${userTag}**`,
      files: [filePath]
    });

    return filePath;
  } catch (err) {
    console.error('saveAndSend error:', err);
    return null;
  }
}

module.exports = { saveAndSend, buildMarkdown, SAVE_DIR };
