const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { isAdmin } = require('../../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shutdown')
    .setDescription('Owner only: shut down the bot')
    .setDMPermission(false),
  async execute(interaction, client) {
    if (!isAdmin(interaction.user.id)) {
      return interaction.reply({ content: 'Owner only.', flags: 64 });
    }
    const shutdownContainer = new ContainerBuilder().setAccentColor(0xFFDD00).addTextDisplayComponents(new TextDisplayBuilder().setContent('# ⛔ Shutting Down\n\nShutting down...'));
    await interaction.reply({ components: [shutdownContainer], flags: MessageFlags.IsComponentsV2 | 64 });
    setTimeout(() => process.exit(0), 1000);
  },
};
