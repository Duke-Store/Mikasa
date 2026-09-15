const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Delete a number of recent messages in this channel')
    .addIntegerOption((o) =>
      o
        .setName('amount')
        .setDescription('Number of messages (1-100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false),
  async execute(interaction, client) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({
        content: 'You lack Manage Messages permission.',
        flags: 64,
      });
    }

    const amount = interaction.options.getInteger('amount', true);
    const channel = interaction.channel;

    try {
      const deleted = await channel.bulkDelete(amount, true);
      const clearContainer = new ContainerBuilder().setAccentColor(0xFFDD00).addTextDisplayComponents(new TextDisplayBuilder().setContent(`# 🧹 Messages Cleared\n\nDeleted ${deleted.size} messages.`));
      try {
        await interaction.reply({
          components: [clearContainer],
          flags: MessageFlags.IsComponentsV2 | 64,
        });
      } catch (replyErr) {
        console.error('Failed to send clear response:', replyErr.message);
      }
    } catch (e) {
      console.error(e);
      if (e.code === 10008) {
        return;
      }
      try {
        await interaction.reply({
          content: 'Failed to delete messages (they may be older than 14 days).',
          flags: 64,
        });
      } catch (replyErr) {
        console.error('Failed to send error response:', replyErr.message);
      }
    }
  },
};
