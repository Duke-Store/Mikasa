const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { rerollGiveaway } = require('../../giveaway');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('greroll')
    .setDescription('Reroll a giveaway winner')
    .addStringOption(option =>
      option.setName('message_id')
        .setDescription('The message ID of the giveaway')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const messageId = interaction.options.getString('message_id');

    const winnerId = rerollGiveaway(messageId);
    if (!winnerId) {
      return interaction.reply({ content: 'No participants or giveaway not found.', flags: 64 });
    }

    const winner = await interaction.client.users.fetch(winnerId);
    await interaction.reply(`🎉 New winner: ${winner.tag} (${winnerId})`);
  }
};