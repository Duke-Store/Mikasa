const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { getGuildSettings, saveGuildSettingsToFile } = require('../../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setwelcome')
    .setDescription('Set welcome channel and message')
    .addChannelOption((o) => o.setName('channel').setDescription('Welcome channel').setRequired(true))
    .addStringOption((o) =>
      o.setName('message').setDescription('Use {user} and {server} placeholders').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),
  async execute(interaction, client) {
    await interaction.deferReply({ flags: 64 }).catch(() => {});
    const channel = interaction.options.getChannel('channel', true);
    const message = interaction.options.getString('message') || 'Welcome {user} to {server}!';

    if (!channel.isTextBased) {
      return interaction.editReply({ content: 'Select a text channel.', flags: 64 });
    }

    const s = getGuildSettings(interaction.guild.id);
    s.welcomeChannelId = channel.id;
    s.welcomeMessage = message;
    saveGuildSettingsToFile();
    const welcomeContainer = new ContainerBuilder().setAccentColor(0xFFDD00).addTextDisplayComponents(new TextDisplayBuilder().setContent(`# 👋 Welcome Channel Set\n\nWelcome messages will be sent in ${channel}.`));
    await interaction.editReply({ components: [welcomeContainer], flags: MessageFlags.IsComponentsV2 });
  },
};
