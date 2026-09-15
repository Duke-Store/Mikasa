const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('say')
    .setDescription('Make the bot say something in this channel')
    .addStringOption((o) => o.setName('message').setDescription('Message content').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false),
  async execute(interaction, client) {
    const msg = interaction.options.getString('message', true);
    try {
      await interaction.channel.send(msg);
      await interaction.reply({ content: 'Message sent.', flags: 64 });
    } catch (error) {
      if (error.code === 50013) {
        return interaction.reply({ content: 'I do not have permission to send messages in this channel.', flags: 64 });
      }
      throw error;
    }
  },
};
