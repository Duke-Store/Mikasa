const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { startBuyerFlow } = require('../../projectTicket');
const { isStaffMember } = require('../../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('marketplace_buy')
    .setDescription('Request a custom project from our developers (alternative entry)'),
  async execute(interaction, client) {
    // Defer reply
    await interaction.deferReply({ flags: MessageFlags.IsComponentsV2 | 64 }).catch(() => {});

    const guild = interaction.guild;
    const user = interaction.user;

    // Find existing buy_req ticket
    const ticketChannel = guild.channels.cache.find(c => {
      if (!c.name?.startsWith('🎫・')) return false;
      const overwrites = c.permissionOverwrites.cache.get(user.id);
      return overwrites && overwrites.allow?.has(PermissionFlagsBits.ViewChannel);
    });

    if (ticketChannel) {
      await startBuyerFlow({ channel: ticketChannel, user, guild }, client);
      return interaction.editReply({ content: '✅ buyer flow started in your existing ticket.', flags: MessageFlags.IsComponentsV2 | 64 });
    }

    // No ticket found
    const container = new ContainerBuilder()
      .setAccentColor(0xFFDD00)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# 📋 Open a Buy Request Ticket\n\nTo request a custom project, you need to open a ticket.\n\nOpen a ticket with type **Request a Project / Buy** from the ticket panel.`)
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('view_ticket_panel')
        .setLabel('Open Ticket Panel')
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.editReply({ components: [container, row], flags: MessageFlags.IsComponentsV2 | 64 });
  }
};
