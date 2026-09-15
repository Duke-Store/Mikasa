const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { getGuildSettings, saveGuildSettingsToFile } = require('../../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setautorole')
    .setDescription('Set a role to auto-assign to new members')
    .addRoleOption((o) => o.setName('role').setDescription('Role to give on join').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .setDMPermission(false),
  async execute(interaction, client) {
    const role = interaction.options.getRole('role', true);
    const s = getGuildSettings(interaction.guild.id);
    s.autoRoleId = role.id;
    saveGuildSettingsToFile();
    const autoRoleContainer = new ContainerBuilder().setAccentColor(0xFFDD00).addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ✅ Auto Role Set\n\nNew members will receive role ${role}.`));
    await interaction.reply({ components: [autoRoleContainer], flags: MessageFlags.IsComponentsV2 });
  },
};
