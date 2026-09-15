const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const ticketConfig = require('../../ticket-config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('come')
    .setDescription('DM a user to come to this ticket channel.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to notify')
        .setRequired(true)
    ),
  async execute(interaction) {
    if (!interaction.channel.name.startsWith('🎫・')) {
      return interaction.reply({ content: '❌ This command can only be used inside a ticket channel.', flags: 64 });
    }

    if (!interaction.member.roles.cache.has(ticketConfig.STAFF_ROLE_ID) && !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: ticketConfig.MESSAGES.ERROR_NO_PERMISSION, flags: 64 });
    }

    const targetUser = interaction.options.getUser('user');
    const ticketLink = `https://discord.com/channels/${interaction.guildId}/${interaction.channel.id}`;

    const container = new ContainerBuilder()
      .setAccentColor(0xFFDD00)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# 👋 You've Been Called!\n\n<@${interaction.user.id}> is requesting your presence in a ticket channel.\n\n**Ticket:** ${interaction.channel.name}\n**Server:** ${interaction.guild.name}\n\n[Click here to join the ticket](${ticketLink})`),
        new TextDisplayBuilder().setContent(`*<t:${Math.floor(Date.now() / 1000)}:F>*`)
      );

    try {
      await targetUser.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
      const successContainer = new ContainerBuilder()
        .setAccentColor(0xFFDD00)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`✅ Successfully notified ${targetUser} to come to this ticket.`)
        );
      await interaction.reply({ components: [successContainer], flags: MessageFlags.IsComponentsV2 | 64 });
    } catch (err) {
      await interaction.reply({ content: `❌ Could not DM ${targetUser}. They may have DMs disabled.`, flags: 64 });
    }
  },
};
