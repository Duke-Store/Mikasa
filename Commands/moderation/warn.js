const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { safeRespond, logModerationAction } = require('../../utils');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('warn')
		.setDescription('Issue a warning to a user')
		.addUserOption((o) => o.setName('user').setDescription('User to warn').setRequired(true))
		.addStringOption((o) => o.setName('reason').setDescription('Reason for warning').setRequired(false))
		.setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
		.setDMPermission(false),
	async execute(interaction, client) {
		if (!interaction.memberPermissions?.has(PermissionFlagsBits.KickMembers)) {
			return safeRespond(interaction, { content: 'You lack permission to warn users.', flags: 64 });
		}

		const target = interaction.options.getUser('user', true);
		const reason = interaction.options.getString('reason') || 'No reason provided';

		// Placeholder behaviour: just log and acknowledge. Persistent storage is not implemented.
		await logModerationAction(interaction.guild, 'Warn', interaction.user.tag, target.tag, reason);
		const warnContainer = new ContainerBuilder().setAccentColor(0xFFDD00).addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ⚠️ User Warned\n\n**User:** ${target.tag}\n**Reason:** ${reason}`));
		await safeRespond(interaction, { components: [warnContainer], flags: MessageFlags.IsComponentsV2 | 64 });
	},
};



