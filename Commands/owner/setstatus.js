const { SlashCommandBuilder, ActivityType, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { safeRespond, isAdmin } = require('../../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setstatus')
    .setDescription('Change the bot presence (admin/owner only)')
    .addStringOption((o) =>
      o
        .setName('activity_type')
        .setDescription('What type of activity')
        .setRequired(true)
        .addChoices(
          { name: 'Playing', value: 'PLAYING' },
          { name: 'Watching', value: 'WATCHING' },
          { name: 'Listening', value: 'LISTENING' },
          { name: 'Competing', value: 'COMPETING' }
        )
    )
    .addStringOption((o) => o.setName('text').setDescription('Status text, e.g. "with commands"').setRequired(true))
    .addStringOption((o) =>
      o
        .setName('status')
        .setDescription('Online status')
        .setRequired(false)
        .addChoices(
          { name: 'Online', value: 'online' },
          { name: 'Idle', value: 'idle' },
          { name: 'Do Not Disturb', value: 'dnd' },
          { name: 'Invisible', value: 'invisible' }
        )
    )
    .setDMPermission(false),
  async execute(interaction, client) {
    if (!isAdmin(interaction.user.id)) {
      return safeRespond(interaction, { content: 'Owner/admin only.', flags: 64 });
    }

    const typeStr = interaction.options.getString('activity_type', true);
    const text = interaction.options.getString('text', true);
    const status = interaction.options.getString('status') || 'online';

    let activityType;
    switch (typeStr) {
      case 'PLAYING':
        activityType = ActivityType.Playing;
        break;
      case 'WATCHING':
        activityType = ActivityType.Watching;
        break;
      case 'LISTENING':
        activityType = ActivityType.Listening;
        break;
      case 'COMPETING':
        activityType = ActivityType.Competing;
        break;
      default:
        activityType = ActivityType.Playing;
    }

    client.user.setPresence({
      activities: [{ name: text, type: activityType }],
      status,
    });

    const statusContainer = new ContainerBuilder().setAccentColor(0xFFDD00).addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ✅ Status Updated\n\nStatus updated to **${typeStr.toLowerCase()} ${text}** (${status}).`));
    await interaction.reply({
      components: [statusContainer],
      flags: MessageFlags.IsComponentsV2 | 64,
    });
  },
};
