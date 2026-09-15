const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { startSellerFlow } = require('../../projectTicket');
const { isStaffMember } = require('../../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('marketplace_submit')
    .setDescription('Submit a product to the marketplace (alternative entry)'),
  async execute(interaction, client) {
    // Defer reply
    await interaction.deferReply({ flags: MessageFlags.IsComponentsV2 | 64 }).catch(() => {});

    // Check if user has an open ticket for selling
    const guild = interaction.guild;
    const user = interaction.user;

    // Find existing sell ticket
    const ticketChannel = guild.channels.cache.find(c => {
      if (!c.name?.startsWith('🎫・')) return false;
      const overwrites = c.permissionOverwrites.cache.get(user.id);
      return overwrites && overwrites.allow?.has(PermissionFlagsBits.ViewChannel);
    });

    if (ticketChannel) {
      // Use existing ticket
      await startSellerFlow({ channel: ticketChannel, user, guild }, client);
      return interaction.editReply({ content: '✅ seller flow started in your existing ticket.', flags: MessageFlags.IsComponentsV2 | 64 });
    }

    // No ticket found - prompt user to open one
    const container = new ContainerBuilder()
      .setAccentColor(0xFFDD00)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# 🛒 Open a Sell Ticket\n\nTo submit a product, you need to open a ticket.\n\nOpen a ticket with type **Sell a Project / Product** from the ticket panel.`)
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
