const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { safeRespond } = require('../../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Unlock this channel for @everyone')
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
      await channel.permissionOverwrites.edit(everyoneRole, { SendMessages: null });
      const unlockContainer = new ContainerBuilder().setAccentColor(0xFFDD00).addTextDisplayComponents(new TextDisplayBuilder().setContent('# 🔓 Channel Unlocked\n\nChannel unlocked for @everyone.'));
      await interaction.reply({ components: [unlockContainer], flags: MessageFlags.IsComponentsV2 });
    } catch (e) {
      console.error(e);
      await safeRespond(interaction, { content: 'Failed to unlock channel.', flags: 64 });
    }
  },
};
