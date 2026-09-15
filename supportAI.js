const { Client, GatewayIntentBits, Partials, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const { getAIResponse } = require('./ratingSystem/aiHandler');
const fs = require('fs');
const path = require('path');
const { writeFileAsync } = require('./utils');

const SUPPORT_LOG_FILE = path.join(__dirname, 'supportAI.json');

let supportLog = [];
let supportClient = null;
let supportConfig = null;

function loadSupportLog() {
  try {
    if (!fs.existsSync(SUPPORT_LOG_FILE)) return;
    const raw = fs.readFileSync(SUPPORT_LOG_FILE, 'utf8').trim();
    if (!raw) return;
    supportLog = JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load support AI log:', err.message);
  }
}

function saveSupportLog() {
  try {
    return writeFileAsync(SUPPORT_LOG_FILE, JSON.stringify(supportLog, null, 2));
  } catch (err) {
    console.error('Failed to save support AI log:', err.message);
    return Promise.resolve();
  }
}

const SUPPORT_SYSTEM_PROMPT = `You are a helpful support agent for a Roblox development server called Lunexis/Aurex.
Talk naturally like a human — friendly, professional, and conversational.
Answer questions about: server rules, marketplace, pricing, how to submit projects, how to buy products, developer applications, ticket system, payment methods, and general server info.

IMPORTANT RULES:
1. Be honest — if you don't know something, say "I'm not sure about that, let me connect you with a real admin who can help."
2. NEVER make up answers or pretend to know something you don't.
3. NEVER pretend to be human — be honest that you're an AI assistant.
4. Keep responses concise but helpful (2-4 sentences typically).

ESCALATION TRIGGERS — if any of these appear, escalate to a real admin:
- User asks for a human/admin explicitly ("talk to human", "real person", "admin please")
- User is angry or frustrated (ALL CAPS, "unacceptable", "scam", "angry", "ridiculous")
- Topic is outside your knowledge (billing disputes, legal issues, account bans, personal info)
- User says "admin", "manager", "owner", "human", "real person" multiple times
- User mentions "refund" in a dispute context
- User says they want to speak to someone in charge

WHEN ESCALATING:
- Say: "I understand. Let me connect you with an admin who can help with this."
- Ping the admin role: <@&ADMIN_ROLE_ID>
- Log the escalation to supportAI.json
- Do NOT try to handle the issue yourself after escalating

Otherwise, answer helpfully and naturally.`;

async function handleSupportMessage(message, client) {
  const userId = message.author.id;
  const username = message.author.username;
  const userMessage = message.content;

  // Don't respond to bots
  if (message.author.bot) return;

  // Check if message is directed at support bot
  const supportUserId = supportConfig?.SUPPORT_BOT_USER_ID;
  const isDM = !message.guild;
  const isMention = message.mentions.users.has(supportUserId) || message.content.includes(`<@${supportUserId}>`) || message.content.includes(`<@!${supportUserId}>`);
  const isSupportChannel = message.guild && supportConfig?.SUPPORT_CHANNEL_ID === message.channel.id;

  if (!isDM && !isMention && !isSupportChannel) return;

  console.log(`[SupportAI] Message from ${username} (${userId}): ${userMessage.slice(0, 100)}`);

  try {
    // Show typing indicator
    await message.channel.sendTyping().catch(() => {});

    // Get AI response
    const aiResponse = await getAIResponse(`support_${userId}`, userMessage);

    // Check for escalation triggers
    const escalationTriggers = [
      'talk to human', 'real person', 'admin please', 'talk to admin',
      'i want to speak', 'talk to someone', 'real admin',
      'scam', 'unacceptable', 'angry', 'ridiculous', 'terrible service',
      'refund my', 'want a refund', 'demand a refund',
      'billing dispute', 'legal', 'lawsuit', 'account ban',
      'person in charge', 'manager', 'owner of the server',
    ];

    const lowered = userMessage.toLowerCase();
    const shouldEscalate = escalationTriggers.some(trigger => lowered.includes(trigger));

    // Also check if AI response indicates uncertainty
    const uncertaintyPhrases = [
      "i don't know",
      "i am not sure",
      "i cannot answer",
      "i am not aware",
      "i do not have information",
    ];

    const needsEscalation = shouldEscalate ||
      uncertaintyPhrases.some(phrase => lowered.includes(phrase) && lowered.includes('?')) ||
      (aiResponse.length < 20 && !userMessage.toLowerCase().includes('?') === false);

    if (needsEscalation && isDM) {
      // Escalate in DM
      const escalationMsg = 'I understand. Let me connect you with an admin who can help with this. An admin will be with you shortly.';
      await message.reply(escalationMsg).catch(() => {});

      // Log escalation
      const logEntry = {
        userId,
        username,
        channelId: message.channel.id,
        guildId: message.guild?.id || null,
        issue: userMessage.slice(0, 500),
        escalatedAt: new Date().toISOString(),
        handledBy: null,
        type: 'escalation',
      };
      supportLog.push(logEntry);
      saveSupportLog();

      // Try to ping admin (if in a guild)
      if (message.guild && supportConfig?.ADMIN_ROLE_ID) {
        try {
          const adminRole = message.guild.roles.cache.get(supportConfig.ADMIN_ROLE_ID);
          if (adminRole) {
            await message.reply({ content: `<@&${supportConfig.ADMIN_ROLE_ID}>`, flags: MessageFlags.IsComponentsV2 }).catch(() => {});
          }
        } catch (err) {
          console.error('[SupportAI] Failed to ping admin:', err.message);
        }
      }

      console.log(`[SupportAI] Escalated for user ${username}`);
      return;
    }

    // Send response
    if (aiResponse.length <= 2000) {
      await message.reply(aiResponse).catch(() => {});
    } else {
      const chunks = [];
      let remaining = aiResponse;
      while (remaining.length > 0) {
        chunks.push(remaining.substring(0, 2000));
        remaining = remaining.substring(2000);
      }
      for (const chunk of chunks) {
        await message.channel.send(chunk).catch(() => {});
      }
    }

    console.log(`[SupportAI] Response sent to ${username}`);
  } catch (error) {
    console.error(`[SupportAI] Error for ${username}:`, error.message);
    try {
      await message.reply("Sorry, I'm having trouble responding right now. Please try again in a moment, or contact an admin for help.").catch(() => {});
    } catch (replyError) {
      console.error('[SupportAI] Could not send error reply:', replyError.message);
    }
  }
}

function initSupportAI(client, config) {
  supportConfig = config;

  if (!config.SUPPORT_BOT_TOKEN) {
    console.warn('[SupportAI] SUPPORT_BOT_TOKEN not configured. Support AI agent disabled.');
    return null;
  }

  supportClient = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel, Partials.Message, Partials.User],
  });

  supportClient.on('messageCreate', (message) => {
    handleSupportMessage(message, supportClient);
  });

  supportClient.on('ready', () => {
    console.log(`[SupportAI] Support AI agent ready as ${supportClient.user.tag}`);
  });

  return supportClient;
}

function startSupportAI() {
  if (!supportClient) {
    console.warn('[SupportAI] Support client not initialized. Call initSupportAI first.');
    return;
  }
  supportClient.login(supportConfig.SUPPORT_BOT_TOKEN);
}

loadSupportLog();

module.exports = {
  initSupportAI,
  startSupportAI,
  handleSupportMessage,
  SUPPORT_SYSTEM_PROMPT,
  loadSupportLog,
  saveSupportLog,
};
