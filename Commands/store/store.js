const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { getGuildSettings, safeRespond } = require('../../utils');

module.exports = {
	data: new SlashCommandBuilder().setName('store').setDescription('Open the server store'),
	async execute(interaction, client) {
		const s = getGuildSettings(interaction.guild.id);
		const details = s.storeDetails || 'No store details configured for this server.';
		const storeContainer = new ContainerBuilder().setAccentColor(0xFFDD00).addTextDisplayComponents(new TextDisplayBuilder().setContent(`# 🏪 Server Store\n\n${details}`));
		await safeRespond(interaction, { components: [storeContainer], flags: MessageFlags.IsComponentsV2 });
	},
};
