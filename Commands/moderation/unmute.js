const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { safeRespond, logToGuild } = require('../../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Remove timeout (mute) from a member')
    .addUserOption((o) => o.setName('user').setDescription('User to unmute').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false),
  async execute(interaction, client) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({
        content: 'You lack Moderate Members permission.',
        flags: 64,
      });
    }

    const target = interaction.options.getMember('user');

    if (!target) {
      return interaction.reply({ content: 'User is not in this server.', flags: 64 });
    }

    try {
      await target.timeout(null, 'Unmuted');
      const unmuteContainer = new ContainerBuilder().setAccentColor(0xFFDD00).addTextDisplayComponents(new TextDisplayBuilder().setContent(`# 🔊 User Unmuted\n\n**User:** ${target.user.tag}`));
      await interaction.reply({ components: [unmuteContainer], flags: MessageFlags.IsComponentsV2 });
      await logToGuild(
        interaction.guild,
        `User ${target.user.tag} (${target.id}) was unmuted by ${interaction.user.tag}.`
      );
    } catch (e) {
      console.error(e);
      await safeRespond(interaction, { content: 'Failed to unmute that user.', flags: 64 });
    }
  },
};
