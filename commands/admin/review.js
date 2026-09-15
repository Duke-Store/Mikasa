const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getPendingReviews } = require('../../adminReviewTimer');
const { isAdmin } = require('../../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin_review')
    .setDescription('Manage pending admin reviews (staff only)')
    .addStringOption(opt =>
      opt.setName('type')
      .setDescription('Filter by type: seller or buyer')
      .setRequired(false)
      .addChoices(
        { name: 'Seller submissions', value: 'seller' },
        { name: 'Buyer requests', value: 'buyer' }
      )
    ),
  async execute(interaction, client) {
    // Auth check
    if (!isAdmin(interaction.user.id)) {
      return interaction.reply({
        content: '❌ You do not have permission to use this command.',
        flags: MessageFlags.IsComponentsV2 | 64
      });
    }

    await interaction.deferReply({ flags: MessageFlags.IsComponentsV2 | 64 }).catch(() => {});

    const filterType = interaction.options.getString('type') || null;
    const pending = getPendingReviews();

    let filtered = pending;
    if (filterType) {
      filtered = pending.filter(r => r.type === filterType);
    }

    if (filtered.length === 0) {
      const msg = filterType
        ? `No pending ${filterType} reviews at this time.`
        : 'No pending reviews at this time.';
      return interaction.editReply({
        content: msg,
        flags: MessageFlags.IsComponentsV2 | 64
      });
    }

    // Build summary embed
    let content = `**📋 Pending Admin Reviews (${filtered.length})**\n\n`;
    for (const review of filtered.slice(0, 10)) {
      const age = Math.floor((Date.now() - review.submittedAt) / 60000);
      content += `**#${review.ticketNumber}** — ${review.type} — ${review.userTag}\n`;
      content += `Submitted ${age}m ago | Expires <t:${Math.floor(review.expiresAt / 1000)}:R>\n\n`;
    }

    if (filtered.length > 10) {
      content += `...and ${filtered.length - 10} more. Use the button to view details.`;
    }

    const container = new ContainerBuilder()
      .setAccentColor(0xFFDD00)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));

    await interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 | 64 });
  }
};
