const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getRatingStatus, getRandomMember, buildRatingEmbed } = require('../ratingSystem/autoRating');

module.exports = {
  name: 'sendrating',
  description: 'Manually send a rating now (uses the configured channel)',
  aliases: ['send-rating'],
  usage: '',
  permissions: [PermissionFlagsBits.ManageGuild],
  cooldown: 5,
  async execute(message, args, client) {
    const status = getRatingStatus(message.guild.id);
    if (!status) {
      return message.reply('⚠️ No rating channel configured. Use `setratingchannel` first.');
    }

    const channel = message.guild.channels.cache.get(status.channelId);
    if (!channel) {
      return message.reply('⚠️ Configured channel not found. Was it deleted?');
    }

    const member = await getRandomMember(message.guild);
    if (!member) {
      return message.reply('⚠️ Could not find any non-bot members to use.');
    }

    const embed = buildRatingEmbed(member);
    await channel.send({ embeds: [embed] });

    await message.reply(`✅ Rating sent in <#${status.channelId}> as **${member.displayName}**`);
  },
};
