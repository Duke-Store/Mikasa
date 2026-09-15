const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { getGuildSettings, saveGuildSettingsToFile } = require('../../utils');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('setmuterole')
		.setDescription('Set the role used for muting members')
		.addRoleOption((o) => o.setName('role').setDescription('Role to use when muting').setRequired(true))
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
		.setDMPermission(false),
	async execute(interaction, client) {
		const role = interaction.options.getRole('role', true);
		const s = getGuildSettings(interaction.guild.id);
		s.muteRoleId = role.id;
		saveGuildSettingsToFile();
		const muteRoleContainer = new ContainerBuilder().setAccentColor(0xFFDD00).addTextDisplayComponents(new TextDisplayBuilder().setContent(`# 🔇 Mute Role Set\n\nMute role set to ${role}.`));
		await interaction.reply({ components: [muteRoleContainer], flags: MessageFlags.IsComponentsV2 | 64 });
	},
};



