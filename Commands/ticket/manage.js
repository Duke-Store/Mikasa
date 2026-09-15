const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const ticketConfig = require('../../ticket-config.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('manage')
		.setDescription('Add or remove a user from the current ticket.')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
		.addSubcommand(subcommand => subcommand.setName('add').setDescription('Add a user to the current ticket.').addUserOption(option => option.setName('user').setDescription('User to add').setRequired(true)))
		.addSubcommand(subcommand => subcommand.setName('remove').setDescription('Remove a user from the current ticket.').addUserOption(option => option.setName('user').setDescription('User to remove').setRequired(true))),
	async execute(interaction) {
		if (!interaction.channel.name.startsWith('🎫・')) return interaction.reply({ content: '❌ This command must be used inside a ticket channel.', flags: 64 });

		if (!interaction.member.roles.cache.has(ticketConfig.STAFF_ROLE_ID) && !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
			return interaction.reply({ content: ticketConfig.MESSAGES.ERROR_NO_PERMISSION, flags: 64 });
		}

		const user = interaction.options.getUser('user');
		const action = interaction.options.getSubcommand();
		const member = interaction.guild.members.cache.get(user.id);

		if (!member) return interaction.reply({ content: '❌ User not found in server.', flags: 64 });

		await interaction.deferReply({ flags: 64 });
		try {
			if (action === 'add') {
				await interaction.channel.permissionOverwrites.edit(user.id, { ViewChannel: true, SendMessages: true });
				const addContainer = new ContainerBuilder().setAccentColor(0xFFDD00).addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ✅ User Added\n\nAdded ${user.tag} to this ticket.`));
				await interaction.editReply({ components: [addContainer], flags: MessageFlags.IsComponentsV2 | 64 });
				const addAnnounceContainer = new ContainerBuilder().setAccentColor(0xFFDD00).addTextDisplayComponents(new TextDisplayBuilder().setContent(`**➕ ${interaction.user.tag}** added ${user} to this ticket.`));
				await interaction.channel.send({ components: [addAnnounceContainer], flags: MessageFlags.IsComponentsV2 });
			} else if (action === 'remove') {
				await interaction.channel.permissionOverwrites.edit(user.id, { ViewChannel: false });
				const removeContainer = new ContainerBuilder().setAccentColor(0xFFDD00).addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ✅ User Removed\n\nRemoved ${user.tag} from this ticket.`));
				await interaction.editReply({ components: [removeContainer], flags: MessageFlags.IsComponentsV2 | 64 });
				const removeAnnounceContainer = new ContainerBuilder().setAccentColor(0xFFDD00).addTextDisplayComponents(new TextDisplayBuilder().setContent(`**➖ ${interaction.user.tag}** removed ${user} from this ticket.`));
				await interaction.channel.send({ components: [removeAnnounceContainer], flags: MessageFlags.IsComponentsV2 });
			}
		} catch (error) {
			console.error('Failed to manage ticket user:', error);
			await interaction.editReply({ content: '❌ An error occurred while executing the command.', flags: 64 });
		}
	},
};
