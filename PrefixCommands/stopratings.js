const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { stopRating, getRatingStatus } = require('../ratingSystem/autoRating');

module.exports = {
  name: 'stopratings',
  description: 'Stop auto-ratings in this server',
  usage: '',
  permissions: [PermissionFlagsBits.ManageGuild],
  cooldown: 5,
  async execute(message, args, client) {
    const status = getRatingStatus(message.guild.id);
    if (!status) {
      return message.reply('⚠️ Auto-ratings are not active in this server.');
    }

    stopRating(message.guild.id);

    const embed = new EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle('🛑 Auto-Ratings Stopped')
      .setDescription('Auto-rating has been disabled for this server.')
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  },
};
