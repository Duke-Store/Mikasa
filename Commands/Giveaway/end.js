const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { endGiveaway } = require('../../giveaway');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gend')
    .setDescription('End a giveaway early')
    .addStringOption(option =>
      option.setName('message_id')
        .setDescription('The message ID of the giveaway')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const messageId = interaction.options.getString('message_id');

    const giveaway = endGiveaway(messageId);
    if (!giveaway) {
      return interaction.reply({ content: 'Giveaway not found.', flags: 64 });
    }

    await interaction.reply({ content: 'Giveaway ended early.', flags: 64 });
  }
};