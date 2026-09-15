const { SlashCommandBuilder } = require('discord.js');
const { safeRespond } = require('../../utils');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('warnings')
		.setDescription('Show warnings for a user (placeholder)'),
	async execute(interaction, client) {
		// Placeholder: the project does not have a persistent warnings store by default.
		await safeRespond(interaction, {
			content: 'Warnings feature is not configured on this bot. Use the moderation log for details.',
			flags: 64,
		});
	},
};



