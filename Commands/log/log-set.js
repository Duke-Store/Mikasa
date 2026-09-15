const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { getGuildSettings, saveGuildSettingsToFile, safeRespond } = require('../../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('log-set')
    .setDescription('Set which room (channel) is used for a specific log type')
    .addStringOption((o) =>
      o
        .setName('type')
        .setDescription('Which log type')
        .setRequired(true)
        .addChoices(
          { name: 'Timeout logs', value: 'timeout' },
          { name: 'Ban logs', value: 'ban' },
          { name: 'Unban logs', value: 'unban' },
          { name: 'Warn logs', value: 'warn' },
          { name: 'Kick logs', value: 'kick' },
          { name: 'Join logs (member joined)', value: 'join' },
          { name: 'Leave logs (member left)', value: 'leave' },
          { name: 'Role created logs', value: 'roleCreate' },
          { name: 'Role deleted logs', value: 'roleDelete' },
          { name: 'Generic / fallback logs', value: 'generic' }
        )
    )
    .addChannelOption((o) => o.setName('room').setDescription('Room (channel) to use for this log type').setRequired(true)),
  async execute(interaction, client) {
    const logType = interaction.options.getString('type', true);
    const room = interaction.options.getChannel('room', true);

    if (!room.isTextBased) {
      return safeRespond(interaction, {
        content: 'Please select a **text** channel.',
        flags: 64,
      });
    }

    const settings = getGuildSettings(interaction.guild.id);

    switch (logType) {
      case 'timeout':
        settings.timeoutLogChannelId = room.id;
        break;
      case 'ban':
        settings.banLogChannelId = room.id;
        break;
      case 'unban':
        settings.unbanLogChannelId = room.id;
        break;
      case 'warn':
        settings.warnLogChannelId = room.id;
        break;
      case 'kick':
        settings.kickLogChannelId = room.id;
        break;
      case 'join':
        settings.joinLogChannelId = room.id;
        break;
      case 'leave':
        settings.leaveLogChannelId = room.id;
        break;
      case 'roleCreate':
        settings.roleCreateLogChannelId = room.id;
        break;
      case 'roleDelete':
        settings.roleDeleteLogChannelId = room.id;
        break;
      case 'generic':
        settings.logChannelId = room.id;
        break;
    }

    saveGuildSettingsToFile();

    const logSetContainer = new ContainerBuilder().setAccentColor(0xFFDD00).addTextDisplayComponents(new TextDisplayBuilder().setContent(`# 📝 Log Room Set\n\nLog room for **${logType}** has been set to ${room}.`));
    await interaction.reply({
      components: [logSetContainer],
      flags: MessageFlags.IsComponentsV2 | 64,
    });
  },
};
