const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { getGuildSettings, saveGuildSettingsToFile } = require('../../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setmodrole')
    .setDescription('Set the moderator role (for your own checks)')
    .addRoleOption((o) => o.setName('role').setDescription('Moderator role').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .setDMPermission(false),
  async execute(interaction, client) {
    const role = interaction.options.getRole('role', true);
    const s = getGuildSettings(interaction.guild.id);
    s.modRoleId = role.id;
    saveGuildSettingsToFile();
    const modRoleContainer = new ContainerBuilder().setAccentColor(0xFFDD00).addTextDisplayComponents(new TextDisplayBuilder().setContent(`# 🛡️ Mod Role Set\n\nModerator role set to ${role}.`));
    await interaction.reply({ components: [modRoleContainer], flags: MessageFlags.IsComponentsV2 });
  },
};
