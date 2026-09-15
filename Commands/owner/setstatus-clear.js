const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { safeRespond, isAdmin } = require('../../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setstatus-clear')
    .setDescription('Clear custom status and go back to default (admin/owner only)')
    .setDMPermission(false),
  async execute(interaction, client) {
    if (!isAdmin(interaction.user.id)) {
      return safeRespond(interaction, { content: 'Owner/admin only.', flags: 64 });
    }

    client.user.setPresence({
      activities: [],
      status: 'online',
    });

    const clearContainer = new ContainerBuilder().setAccentColor(0xFFDD00).addTextDisplayComponents(new TextDisplayBuilder().setContent('# ✅ Status Cleared\n\nBot status cleared and set to **online**.'));
    await interaction.reply({
      components: [clearContainer],
      flags: MessageFlags.IsComponentsV2 | 64,
    });
  },
};
