const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { getGuildSettings, saveGuildSettingsToFile, safeRespond } = require('../../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('store-setdetails')
    .setDescription('Set the detailed description shown in the store "View Details"')
    .addStringOption((o) =>
      o.setName('text').setDescription('Detailed store info (supports multiple lines)').setRequired(true).setMaxLength(2000)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),
  async execute(interaction, client) {
    const text = interaction.options.getString('text', true);
    const settings = getGuildSettings(interaction.guild.id);
    settings.storeDetails = text;
    saveGuildSettingsToFile();

    const detailsContainer = new ContainerBuilder().setAccentColor(0xFFDD00).addTextDisplayComponents(new TextDisplayBuilder().setContent('# ✅ Store Details Updated\n\nStore details have been updated.'));
    await safeRespond(interaction, {
      components: [detailsContainer],
      flags: MessageFlags.IsComponentsV2 | 64,
    });
  },
};
