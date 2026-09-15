const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Send an announcement to a channel')
    .addChannelOption((o) => o.setName('channel').setDescription('Target channel').setRequired(true))
    .addStringOption((o) => o.setName('message').setDescription('Announcement text').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),
  async execute(interaction, client) {
    const channel = interaction.options.getChannel('channel', true);
    const msg = interaction.options.getString('message', true);

    if (!channel.isTextBased) {
      return interaction.reply({ content: 'Select a text channel.', flags: 64 });
    }

    if (!channel.viewable) {
      return interaction.reply({ content: 'I cannot see that channel.', flags: 64 });
    }

    if (channel.isTextBased && !channel.isDMBased() && !channel.permissionsFor(client.user)?.has(PermissionFlagsBits.SendMessages)) {
      return interaction.reply({ content: 'I lack Send Messages permission in that channel.', flags: 64 });
    }

    try {
      await channel.send(msg);
      await interaction.reply({ content: `Announcement sent in ${channel}.`, flags: 64 });
    } catch (error) {
      console.error('Announcement send failed:', error);
      await interaction.reply({ content: `Failed to send message in ${channel}. Check my permissions.`, flags: 64 });
    }
  },
};
