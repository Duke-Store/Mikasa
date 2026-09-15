const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { getGuildSettings, saveGuildSettingsToFile } = require('../../utils');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('setprefix')
		.setDescription('Set the command prefix for the server (for legacy prefix commands)')
		.addStringOption((o) => o.setName('prefix').setDescription('New prefix').setRequired(true))
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
		.setDMPermission(false),
	async execute(interaction, client) {
		const prefix = interaction.options.getString('prefix', true);
		const s = getGuildSettings(interaction.guild.id);
		s.prefix = prefix;
		saveGuildSettingsToFile();
		const prefixContainer = new ContainerBuilder().setAccentColor(0xFFDD00).addTextDisplayComponents(new TextDisplayBuilder().setContent('Prefix set to `' + prefix + '`'));
		await interaction.reply({ components: [prefixContainer], flags: MessageFlags.IsComponentsV2 | 64 });
	},
};
