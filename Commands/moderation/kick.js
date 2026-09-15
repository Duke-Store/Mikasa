const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { safeRespond, logModerationAction } = require('../../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member')
    .addUserOption((o) => o.setName('user').setDescription('User to kick').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Reason').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .setDMPermission(false),
  async execute(interaction, client) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.KickMembers)) {
      return safeRespond(interaction, { content: 'You lack Kick Members permission.', flags: 64 });
    }

    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!target) {
      return safeRespond(interaction, { content: 'User is not in this server.', flags: 64 });
    }
    if (!target.kickable) {
      return safeRespond(interaction, { content: 'I cannot kick that user.', flags: 64 });
    }

    await target.kick(reason);
    const kickContainer = new ContainerBuilder().setAccentColor(0xFFDD00).addTextDisplayComponents(new TextDisplayBuilder().setContent(`# 👢 User Kicked\n\n**User:** ${target.user.tag}\n**Reason:** ${reason}`));
    await interaction.reply({ components: [kickContainer], flags: MessageFlags.IsComponentsV2 });
    await logModerationAction(interaction.guild, 'Kick', interaction.user.tag, target.user.tag, reason);
  },
};
