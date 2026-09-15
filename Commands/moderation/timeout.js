const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { safeRespond, logModerationAction, parseDuration } = require('../../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout (mute) a member for a duration')
    .addUserOption((o) => o.setName('user').setDescription('User to timeout').setRequired(true))
    .addStringOption((o) => o.setName('duration').setDescription('e.g. 10m, 1h, 1d').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Reason').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false),
  async execute(interaction, client) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) {
      return safeRespond(interaction, {
        content: 'You lack Moderate Members permission.',
        flags: 64,
      });
    }

    const target = interaction.options.getMember('user');
    const durationStr = interaction.options.getString('duration', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!target) {
      return safeRespond(interaction, { content: 'User is not in this server.', flags: 64 });
    }

    const ms = parseDuration(durationStr);
    if (!ms || ms <= 0) {
      return safeRespond(interaction, {
        content: 'Invalid duration. Use formats like 10m, 1h, 1d.',
        flags: 64,
      });
    }

    try {
      await target.timeout(ms, reason);
      const timeoutContainer = new ContainerBuilder().setAccentColor(0xFFDD00).addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ⏰ User Timed Out\n\n**User:** ${target.user.tag}\n**Duration:** ${durationStr}\n**Reason:** ${reason}`));
      await interaction.reply({ components: [timeoutContainer], flags: MessageFlags.IsComponentsV2 });
      await logModerationAction(interaction.guild, `Timeout (${durationStr})`, interaction.user.tag, target.user.tag, reason);
    } catch (e) {
      console.error(e);
      await safeRespond(interaction, { content: 'Failed to timeout that user.', flags: 64 });
    }
  },
};
