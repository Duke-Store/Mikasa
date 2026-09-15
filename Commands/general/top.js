const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
const { safeRespond, userStats, voiceSessions, formatDuration } = require('../../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('top')
    .setDescription('Show top members by chat messages and/or voice time')
    .addStringOption((o) =>
      o
        .setName('type')
        .setDescription('What ranking to show')
        .addChoices(
          { name: 'Chat (messages)', value: 'chat' },
          { name: 'Voice (time)', value: 'voice' },
          { name: 'Both', value: 'both' }
        )
        .setRequired(false)
    ),
  async execute(interaction, client) {
    const type = interaction.options.getString('type') || 'both';
    const guild = interaction.guild;

    if (!guild) {
      return safeRespond(interaction, {
        content: 'This command can only be used in a server.',
        flags: 64,
      });
    }

    const gStats = userStats.get(guild.id);
    if (!gStats || gStats.size === 0) {
      return safeRespond(interaction, {
        content: 'No stats recorded yet in this server.',
        flags: 64,
      });
    }

    const now = Date.now();
    const data = [];

    for (const [userId, stat] of gStats.entries()) {
      let voiceMs = stat.voiceMs;
      const key = `${guild.id}:${userId}`;
      const start = voiceSessions.get(key);
      if (start) {
        voiceMs += now - start;
      }
      data.push({
        userId,
        messages: stat.messages,
        voiceMs,
      });
    }

    const nonZero = data.filter((d) => d.messages > 0 || d.voiceMs > 0);
    if (!nonZero.length) {
      return safeRespond(interaction, {
        content: 'No stats recorded yet in this server.',
        flags: 64,
      });
    }

    const byMessages = [...nonZero].sort((a, b) => b.messages - a.messages);
    const byVoice = [...nonZero].sort((a, b) => b.voiceMs - a.voiceMs);
    const topN = 10;

    const buildLinesChat = (arr) =>
      arr.slice(0, topN).map((u, i) => {
        const member = guild.members.cache.get(u.userId);
        const name = member ? member.displayName : `Unknown (${u.userId})`;
        return `**${i + 1}.** ${name} — \`${u.messages}\` messages`;
      });

    const buildLinesVoice = (arr) =>
      arr.slice(0, topN).map((u, i) => {
        const member = guild.members.cache.get(u.userId);
        const name = member ? member.displayName : `Unknown (${u.userId})`;
        return `**${i + 1}.** ${name} — \`${formatDuration(u.voiceMs)}\``;
      });

    const container = new ContainerBuilder()
      .setAccentColor(0xFFDD00);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('# 🏆 Server Leaderboard'),
      new TextDisplayBuilder().setContent('Top members by chat activity and voice time.')
    );

    if (type === 'chat' || type === 'both') {
      const chatLines = buildLinesChat(byMessages);
      container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`**💬 Top Chat (Messages)**\n${chatLines.length ? chatLines.join('\n') : 'No data.'}`));
    }

    if (type === 'voice' || type === 'both') {
      const voiceLines = buildLinesVoice(byVoice);
      container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`**🎙️ Top Voice (Time)**\n${voiceLines.length ? voiceLines.join('\n') : 'No data.'}`));
    }

    await interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
