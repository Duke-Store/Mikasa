const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { getGuildSettings, saveGuildSettingsToFile, safeRespond } = require('../../utils');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('log-off')
		.setDescription('Disable logging in this server')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
		.setDMPermission(false),
	async execute(interaction, client) {
		const s = getGuildSettings(interaction.guild.id);
		s.logEnabled = false;
		saveGuildSettingsToFile();
		const logOffContainer = new ContainerBuilder().setAccentColor(0xFFDD00).addTextDisplayComponents(new TextDisplayBuilder().setContent('# ❌ Logging Disabled\n\nLogging disabled for this server.'));
		await safeRespond(interaction, { components: [logOffContainer], flags: MessageFlags.IsComponentsV2 | 64 });
	},
};
