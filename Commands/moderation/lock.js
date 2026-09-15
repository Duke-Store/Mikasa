const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { safeRespond } = require('../../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Lock this channel for @everyone (no sending messages)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .setDMPermission(false),
  async execute(interaction, client) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.reply({
        content: 'You lack Manage Channels permission.',
        flags: 64,
      });
    }

    const channel = interaction.channel;
    const everyoneRole = interaction.guild.roles.everyone;

    try {
      await channel.permissionOverwrites.edit(everyoneRole, { SendMessages: false });
      const lockContainer = new ContainerBuilder().setAccentColor(0xFFDD00).addTextDisplayComponents(new TextDisplayBuilder().setContent('# 🔒 Channel Locked\n\nChannel locked for @everyone.'));
      await interaction.reply({ components: [lockContainer], flags: MessageFlags.IsComponentsV2 });
    } catch (e) {
      console.error(e);
      await safeRespond(interaction, { content: 'Failed to lock channel.', flags: 64 });
    }
  },
};
