const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { getGuildSettings, saveGuildSettingsToFile } = require('../../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setlog')
    .setDescription('Set moderation log channel')
    .addChannelOption((o) => o.setName('channel').setDescription('Log channel').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),
  async execute(interaction, client) {
    const channel = interaction.options.getChannel('channel', true);
    if (!channel.isTextBased) {
      return interaction.reply({ content: 'Select a text channel.', flags: 64 });
    }
    const s = getGuildSettings(interaction.guild.id);
    s.logChannelId = channel.id;
    saveGuildSettingsToFile();
    const logContainer = new ContainerBuilder().setAccentColor(0xFFDD00).addTextDisplayComponents(new TextDisplayBuilder().setContent(`# 📝 Log Channel Set\n\nLog channel set to ${channel}.`));
    await interaction.reply({ components: [logContainer], flags: MessageFlags.IsComponentsV2 });
  },
};
