const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getRatingStatus } = require('../ratingSystem/autoRating');

module.exports = {
  name: 'ratingstatus',
  description: 'Check the current auto-rating configuration',
  aliases: ['rating-status'],
  usage: '',
  permissions: [PermissionFlagsBits.ManageGuild],
  cooldown: 5,
  async execute(message, args, client) {
    const status = getRatingStatus(message.guild.id);

    if (!status) {
      return message.reply('Auto-ratings are not active in this server. Use `setratingchannel` to enable.');
    }

    const embed = new EmbedBuilder()
      .setColor(0x3498DB)
      .setTitle('📊 Auto-Rating Status')
      .addFields(
        { name: 'Channel', value: `<#${status.channelId}>`, inline: true },
        { name: 'Interval', value: '1–2 hours (random)', inline: true },
        { name: 'Status', value: '✅ Active', inline: true },
      )
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  },
};
