const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { safeRespond, parseDuration, logModerationAction } = require('../../utils');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('mute')
		.setDescription('Timeout (mute) a member')
		.addUserOption((o) => o.setName('user').setDescription('User to mute').setRequired(true))
		.addStringOption((o) => o.setName('duration').setDescription('e.g. 10m, 1h').setRequired(false))
		.addStringOption((o) => o.setName('reason').setDescription('Reason').setRequired(false))
		.setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
		.setDMPermission(false),
	async execute(interaction, client) {
		if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) {
			return safeRespond(interaction, { content: 'You lack Moderate Members permission.', flags: 64 });
		}

		const target = interaction.options.getMember('user');
		const durationStr = interaction.options.getString('duration') || '10m';
		const reason = interaction.options.getString('reason') || 'No reason provided';

		if (!target) return safeRespond(interaction, { content: 'User not found in this server.', flags: 64 });

		const ms = parseDuration(durationStr);
		if (!ms) return safeRespond(interaction, { content: 'Invalid duration format.', flags: 64 });

		try {
			await target.timeout(ms, reason);
			await logModerationAction(interaction.guild, `Mute (${durationStr})`, interaction.user.tag, target.user.tag, reason);
			const muteContainer = new ContainerBuilder().setAccentColor(0xFFDD00).addTextDisplayComponents(new TextDisplayBuilder().setContent(`# 🔇 User Muted\n\n**User:** ${target.user.tag}\n**Duration:** ${durationStr}`));
			await safeRespond(interaction, { components: [muteContainer], flags: MessageFlags.IsComponentsV2 | 64 });
		} catch (e) {
			console.error(e);
			await safeRespond(interaction, { content: 'Failed to mute that user.', flags: 64 });
		}
	},
};



