const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { setRatingChannel, getRatingStatus } = require('../ratingSystem/autoRating');

module.exports = {
  name: 'setratingchannel',
  description: 'Set the channel where auto-ratings will be posted',
  usage: '<#channel>',
  permissions: [PermissionFlagsBits.ManageGuild],
  cooldown: 5,
  async execute(message, args, client) {
    const channel = message.mentions.channels.first() || (args[0] ? message.guild.channels.cache.get(args[0]) : null);
    if (!channel) {
      return message.reply('⚠️ Please mention a text channel or provide a channel ID.');
    }

    setRatingChannel(client, message.guild.id, channel.id);

    const embed = new EmbedBuilder()
      .setColor(0x2ECC71)
      .setTitle('✅ Auto-Rating Channel Set')
      .setDescription(`Ratings will now be posted in ${channel}\nInterval: every **1–2 hours** (randomized)`)
      .setFooter({ text: 'Use stopratings to disable' })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  },
};
