const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { getGuildSettings, saveGuildSettingsToFile } = require('../../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setgoodbye')
    .setDescription('Set goodbye channel and message')
    .addChannelOption((o) => o.setName('channel').setDescription('Goodbye channel').setRequired(true))
    .addStringOption((o) =>
      o.setName('message').setDescription('Use {user} and {server} placeholders').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),
  async execute(interaction, client) {
    await interaction.deferReply({ flags: 64 }).catch(() => {});
    const channel = interaction.options.getChannel('channel', true);
    const message = interaction.options.getString('message') || 'Goodbye {user}, from {server}.';

    if (!channel.isTextBased) {
      return interaction.editReply({ content: 'Select a text channel.', flags: 64 });
    }

    const s = getGuildSettings(interaction.guild.id);
    s.goodbyeChannelId = channel.id;
    s.goodbyeMessage = message;
    saveGuildSettingsToFile();
    const goodbyeContainer = new ContainerBuilder().setAccentColor(0xFFDD00).addTextDisplayComponents(new TextDisplayBuilder().setContent(`# 👋 Goodbye Channel Set\n\nGoodbye messages will be sent in ${channel}.`));
    await interaction.editReply({ components: [goodbyeContainer], flags: MessageFlags.IsComponentsV2 });
  },
};
