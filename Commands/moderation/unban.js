const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { safeRespond, logToGuild } = require('../../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user by ID')
    .addStringOption((o) => o.setName('user_id').setDescription('ID of the user to unban').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setDMPermission(false),
  async execute(interaction, client) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.BanMembers)) {
      return interaction.reply({ content: 'You lack Ban Members permission.', flags: 64 });
    }

    const userId = interaction.options.getString('user_id', true);
    try {
      await interaction.guild.bans.remove(userId);
      const unbanContainer = new ContainerBuilder().setAccentColor(0xFFDD00).addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ✅ User Unbanned\n\n**User ID:** ${userId}`));
      await interaction.reply({ components: [unbanContainer], flags: MessageFlags.IsComponentsV2 });
      await logToGuild(interaction.guild, `User ID ${userId} was unbanned by ${interaction.user.tag}.`);
    } catch (e) {
      console.error(e);
      await safeRespond(interaction, { content: 'Failed to unban that user ID.', flags: 64 });
    }
  },
};
