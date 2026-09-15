const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { getGuildSettings, saveGuildSettingsToFile, safeRespond } = require('../../utils');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('log-on')
		.setDescription('Enable logging in this server')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
		.setDMPermission(false),
	async execute(interaction, client) {
		const s = getGuildSettings(interaction.guild.id);
		s.logEnabled = true;
		saveGuildSettingsToFile();
		const logOnContainer = new ContainerBuilder().setAccentColor(0xFFDD00).addTextDisplayComponents(new TextDisplayBuilder().setContent('# ✅ Logging Enabled\n\nLogging enabled for this server.'));
		await safeRespond(interaction, { components: [logOnContainer], flags: MessageFlags.IsComponentsV2 | 64 });
	},
};
